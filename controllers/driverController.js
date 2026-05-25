const pool = require('../db');

const getAllDrivers = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM drivers');
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Внутрішня помилка сервера при отриманні списку водіїв' });
    }
};

const getDriverById = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM drivers WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Водія з таким ID не знайдено' });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Внутрішня помилка сервера при пошуку водія' });
    }
};

const createDriver = async (req, res) => {
    const { full_name, birth_date, hire_date } = req.body;
    
    // Перевірка (Validation) на наявність усіх обов'язкових полів
    if (!full_name || !birth_date || !hire_date) {
        return res.status(400).json({ error: 'Не всі обов\'язкові поля заповнені (full_name, birth_date, hire_date)' });
    }

    try {
        const [result] = await pool.query(
            'INSERT INTO drivers (full_name, birth_date, hire_date) VALUES (?, ?, ?)',
            [full_name, birth_date, hire_date]
        );
        res.status(201).json({ id: result.insertId, full_name, birth_date, hire_date });
    } catch (error) {
        res.status(500).json({ error: 'Внутрішня помилка сервера при створенні водія' });
    }
};

const deleteDriver = async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM drivers WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Водія з таким ID не знайдено для видалення' });
        }
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Внутрішня помилка сервера при видаленні водія' });
    }
};

module.exports = {
    getAllDrivers,
    getDriverById,
    createDriver,
    deleteDriver
};