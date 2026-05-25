const eventBus = require('../eventBus');

const rateLimitMap = new Map();
const RATE_LIMIT = 50;
const WINDOW_MS = 60 * 1000;

const rateLimiter = (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();

    if (!rateLimitMap.has(ip)) {
        rateLimitMap.set(ip, { count: 1, startTime: now });
        return next();
    }

    const record = rateLimitMap.get(ip);
    if (now - record.startTime > WINDOW_MS) {
        rateLimitMap.set(ip, { count: 1, startTime: now });
        return next();
    }

    record.count++;
    if (record.count > RATE_LIMIT) {
        return res.status(429).json({ error: 'Too Many Requests' });
    }
    
    next();
};

const obfuscateData = (dataObj) => {
    if (!dataObj) return {};
    const sensitiveKeys = ['password', 'token', 'email'];
    const masked = { ...dataObj };
    
    for (let key in masked) {
        if (sensitiveKeys.includes(key.toLowerCase())) {
            masked[key] = '***';
        }
    }
    return masked;
};

const statsCollector = (req, res, next) => {
    const start = process.hrtime();
    
    const originalSend = res.send;
    let timeInMs = null;

    res.send = function (body) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
            const diff = process.hrtime(start);
            timeInMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(3);
            res.setHeader('X-Response-Time', `${timeInMs}ms`);
        }
        originalSend.call(this, body);
    };

    res.on('finish', () => {
        const stats = {
            timestamp: new Date().toISOString(),
            method: req.method,
            path: req.originalUrl,
            status: res.statusCode,
            responseTimeMs: timeInMs,
            userAgent: req.get('User-Agent') || 'Unknown',
            pathVariables: obfuscateData(req.params),
            queryParams: obfuscateData(req.query)
        };

        eventBus.emit('requestCompleted', stats);
    });

    next();
};

module.exports = { rateLimiter, statsCollector, obfuscateData };