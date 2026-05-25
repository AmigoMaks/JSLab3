const request = require('supertest');
const fs = require('fs');
const pool = require('../db');
const eventBus = require('../eventBus');
const { obfuscateData } = require('../middlewares/middlewares');

jest.mock('../db', () => ({
    query: jest.fn()
}));

jest.mock('fs', () => ({
    readFile: jest.fn(),
    writeFile: jest.fn()
}));

const app = require('../app');

describe('Тестування API', () => {
    
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('1. Контролери та Маршрути (Drivers API)', () => {
        
        // GET /
        test('GET /api/drivers - Успіх (200)', async () => {
            pool.query.mockResolvedValue([[{ id: 1, full_name: 'Іван' }]]);
            const res = await request(app).get('/api/drivers');
            expect(res.status).toBe(200);
            expect(res.body[0].full_name).toBe('Іван');
        });

        test('GET /api/drivers - Помилка БД (500)', async () => {
            pool.query.mockRejectedValue(new Error('DB Error'));
            const res = await request(app).get('/api/drivers');
            expect(res.status).toBe(500);
            expect(res.body.error).toBe('Помилка бази даних');
        });

        // GET /:id
        test('GET /api/drivers/:id - Знайдено (200)', async () => {
            pool.query.mockResolvedValue([[{ id: 1 }]]);
            const res = await request(app).get('/api/drivers/1');
            expect(res.status).toBe(200);
        });

        test('GET /api/drivers/:id - Не знайдено (404)', async () => {
            pool.query.mockResolvedValue([[]]);
            const res = await request(app).get('/api/drivers/99');
            expect(res.status).toBe(404);
        });

        test('GET /api/drivers/:id - Помилка БД (500)', async () => {
            pool.query.mockRejectedValue(new Error('DB Error'));
            const res = await request(app).get('/api/drivers/1');
            expect(res.status).toBe(500);
        });

        // POST /
        test('POST /api/drivers - Успішне створення (201)', async () => {
            pool.query.mockResolvedValue([{ insertId: 5 }]);
            const res = await request(app).post('/api/drivers').send({
                full_name: 'Петро', birth_date: '1990-01-01', hire_date: '2020-01-01'
            });
            expect(res.status).toBe(201);
            expect(res.body.id).toBe(5);
        });

        test('POST /api/drivers - Помилка БД (500)', async () => {
            pool.query.mockRejectedValue(new Error('DB Error'));
            const res = await request(app).post('/api/drivers').send({});
            expect(res.status).toBe(500);
        });

        // DELETE /:id
        test('DELETE /api/drivers/:id - Успішне видалення (204)', async () => {
            pool.query.mockResolvedValue([{ affectedRows: 1 }]);
            const res = await request(app).delete('/api/drivers/1');
            expect(res.status).toBe(204);
        });

        test('DELETE /api/drivers/:id - Не знайдено (404)', async () => {
            pool.query.mockResolvedValue([{ affectedRows: 0 }]);
            const res = await request(app).delete('/api/drivers/99');
            expect(res.status).toBe(404);
        });

        test('DELETE /api/drivers/:id - Помилка БД (500)', async () => {
            pool.query.mockRejectedValue(new Error('DB Error'));
            const res = await request(app).delete('/api/drivers/1');
            expect(res.status).toBe(500);
        });
    });

    describe('2. Middlewares (Rate Limiter & Obfuscation)', () => {
        
        test('obfuscateData коректно обробляє null або порожні значення', () => {
            expect(obfuscateData(null)).toEqual({});
        });

        test('obfuscateData маскує чутливі дані та ігнорує звичайні', () => {
            const input = { password: '123', email: 'test@ukr.net', token: 'abc', name: 'Ivan' };
            const output = obfuscateData(input);
            expect(output.password).toBe('***');
            expect(output.email).toBe('***');
            expect(output.token).toBe('***');
            expect(output.name).toBe('Ivan');
        });

        test('Rate Limiter блокує після 50 запитів і скидає ліміт через 60 секунд', async () => {
            pool.query.mockResolvedValue([[]]);
            
            jest.useFakeTimers();
            const initialTime = Date.now();
            jest.spyOn(Date, 'now').mockReturnValue(initialTime);

            for (let i = 0; i < 50; i++) {
                await request(app).get('/api/drivers');
            }

            const blockedRes = await request(app).get('/api/drivers');
            expect(blockedRes.status).toBe(429);

            jest.spyOn(Date, 'now').mockReturnValue(initialTime + 61000);

            const passedRes = await request(app).get('/api/drivers');
            expect(passedRes.status).not.toBe(429);

            jest.useRealTimers();
        });
    });

    describe('3. Subscriber (Запис логів статистики)', () => {
        
        test('Успішно записує нові дані у stats.json (файл існує)', (done) => {
            const existingData = JSON.stringify([{ path: '/old' }]);
            fs.readFile.mockImplementation((path, enc, cb) => cb(null, existingData));
            fs.writeFile.mockImplementation((path, data, cb) => {
                expect(data).toContain('/new');
                cb(null);
                done();
            });

            eventBus.emit('requestCompleted', { path: '/new' });
        });

        test('Створює новий масив, якщо файл не існує або помилка читання', (done) => {
            fs.readFile.mockImplementation((path, enc, cb) => cb(new Error('File not found'), null));
            fs.writeFile.mockImplementation((path, data, cb) => {
                expect(JSON.parse(data)).toHaveLength(1);
                cb(null);
                done();
            });

            eventBus.emit('requestCompleted', { path: '/test' });
        });

        test('Обробляє помилку парсингу JSON (якщо файл пошкоджений)', (done) => {
            fs.readFile.mockImplementation((path, enc, cb) => cb(null, 'invalid json format'));
            fs.writeFile.mockImplementation((path, data, cb) => {
                expect(JSON.parse(data)).toHaveLength(1);
                cb(null);
                done();
            });

            eventBus.emit('requestCompleted', { path: '/test' });
        });

        test('Логує помилку запису у консоль', (done) => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            fs.readFile.mockImplementation((path, enc, cb) => cb(null, '[]'));
            fs.writeFile.mockImplementation((path, data, cb) => {
                cb(new Error('Write error'));
                expect(consoleSpy).toHaveBeenCalledWith('Помилка запису логів:', expect.any(Error));
                consoleSpy.mockRestore();
                done();
            });

            eventBus.emit('requestCompleted', { path: '/test' });
        });
    });
});