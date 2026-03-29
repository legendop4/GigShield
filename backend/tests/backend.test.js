/**
 * GigShield Backend — Complete Test Suite
 * Run with: npm test (after installing deps)
 * 
 * Tests all modules without requiring a live MongoDB.
 * Uses jest + mocked mongoose models.
 */

jest.mock('../models/User');
jest.mock('../models/ActivityLog');
jest.mock('../models/RiskScore');
jest.mock('../models/Payout');
jest.mock('../models/FraudFlag');
jest.mock('../models/Notification');
jest.mock('../services/mlService');
jest.mock('../services/notificationService');
jest.mock('../services/socketService', () => ({
  getIO: () => ({ to: () => ({ emit: jest.fn() }) }),
  init: jest.fn(),
}));

const mongoose = require('mongoose');

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const mockReq = (overrides = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  user: { id: new mongoose.Types.ObjectId().toString(), role: 'worker' },
  ...overrides,
});
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
const mockNext = jest.fn();

const VALID_ID = new mongoose.Types.ObjectId().toString();
const INVALID_ID = 'not-an-objectid';

// ─────────────────────────────────────────────
// MODULE: authController
// ─────────────────────────────────────────────
describe('authController', () => {
  const { register, requestOtp, verifyOtp } = require('../controllers/authController');
  const User = require('../models/User');

  beforeEach(() => { jest.clearAllMocks(); });

  describe('register', () => {
    it('returns 400 if required fields are missing', async () => {
      const req = mockReq({ body: { name: 'Test' } });
      const res = mockRes();
      await register(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it('returns 409 if phone already exists', async () => {
      User.findOne.mockResolvedValueOnce({ _id: VALID_ID }); // phone exists
      const req = mockReq({ body: { name: 'Test', phone: '1234567890', email: 'a@b.com' } });
      const res = mockRes();
      await register(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 409 }));
    });

    it('returns 409 if email already exists', async () => {
      User.findOne
        .mockResolvedValueOnce(null)           // phone not found
        .mockResolvedValueOnce({ _id: VALID_ID }); // email found
      const req = mockReq({ body: { name: 'Test', phone: '1234567890', email: 'a@b.com' } });
      const res = mockRes();
      await register(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 409 }));
    });

    it('returns 201 on successful registration', async () => {
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValueOnce({ _id: VALID_ID, name: 'Test', phone: '123', email: 'a@b.com', role: 'worker' });
      const req = mockReq({ body: { name: 'Test', phone: '1234567890', email: 'a@b.com' } });
      const res = mockRes();
      await register(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('requestOtp', () => {
    it('returns 400 if phone missing', async () => {
      const req = mockReq({ body: {} });
      const res = mockRes();
      await requestOtp(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it('returns 404 if user not found', async () => {
      User.findOne.mockResolvedValueOnce(null);
      const req = mockReq({ body: { phone: '1234567890' } });
      const res = mockRes();
      await requestOtp(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    });

    it('generates OTP and returns 200 with demo_otp', async () => {
      const saveMock = jest.fn().mockResolvedValue(true);
      User.findOne.mockResolvedValueOnce({ _id: VALID_ID, phone: '123', otp: null, otpExpiresAt: null, save: saveMock });
      const req = mockReq({ body: { phone: '1234567890' } });
      const res = mockRes();
      await requestOtp(req, res, mockNext);
      expect(saveMock).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ demo_otp: expect.any(String) }));
    });
  });

  describe('verifyOtp', () => {
    it('returns 400 if phone or otp missing', async () => {
      const req = mockReq({ body: { phone: '123' } });
      const res = mockRes();
      await verifyOtp(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it('returns 401 on invalid OTP', async () => {
      User.findOne.mockResolvedValueOnce({ _id: VALID_ID, otp: '000000', otpExpiresAt: new Date(Date.now() + 10000) });
      const req = mockReq({ body: { phone: '123', otp: '999999' } });
      const res = mockRes();
      await verifyOtp(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    });

    it('returns 401 on expired OTP', async () => {
      User.findOne.mockResolvedValueOnce({ _id: VALID_ID, otp: '123456', otpExpiresAt: new Date(Date.now() - 1000) });
      const req = mockReq({ body: { phone: '123', otp: '123456' } });
      const res = mockRes();
      await verifyOtp(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    });

    it('returns JWT token on valid OTP', async () => {
      const saveMock = jest.fn().mockResolvedValue(true);
      User.findOne.mockResolvedValueOnce({
        _id: VALID_ID, name: 'A', phone: '123', email: 'a@b.com', role: 'worker',
        otp: '123456', otpExpiresAt: new Date(Date.now() + 60000), save: saveMock
      });
      const req = mockReq({ body: { phone: '123', otp: '123456' } });
      const res = mockRes();
      await verifyOtp(req, res, mockNext);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: expect.any(String) }));
      expect(saveMock).toHaveBeenCalled();
    });
  });
});

// ─────────────────────────────────────────────
// MODULE: activityController
// ─────────────────────────────────────────────
describe('activityController', () => {
  const { createActivity, getUserActivities, bulkCreateActivity } = require('../controllers/activityController');
  const ActivityLog = require('../models/ActivityLog');

  beforeEach(() => jest.clearAllMocks());

  describe('createActivity', () => {
    it('returns 400 for invalid userId', async () => {
      const req = mockReq({ body: { userId: INVALID_ID, location: { lat: 1, lng: 1 } } });
      await createActivity(req, mockRes(), mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it('returns 400 for missing location', async () => {
      const req = mockReq({ body: { userId: VALID_ID } });
      await createActivity(req, mockRes(), mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it('returns 400 for negative deliveriesCompleted', async () => {
      const req = mockReq({ body: { userId: VALID_ID, location: { lat: 1, lng: 1 }, deliveriesCompleted: -1 } });
      await createActivity(req, mockRes(), mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it('creates activity and returns 201', async () => {
      ActivityLog.create.mockResolvedValueOnce({ _id: VALID_ID });
      const req = mockReq({ body: { userId: VALID_ID, location: { lat: 12.9, lng: 77.5 } } });
      const res = mockRes();
      await createActivity(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('getUserActivities', () => {
    it('returns 400 for invalid userId param', async () => {
      const req = mockReq({ params: { userId: INVALID_ID }, query: {} });
      await getUserActivities(req, mockRes(), mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it('returns paginated activity logs', async () => {
      ActivityLog.countDocuments.mockResolvedValueOnce(1);
      ActivityLog.find.mockReturnValueOnce({
        sort: () => ({ skip: () => ({ limit: () => ({ exec: () => Promise.resolve([{ _id: VALID_ID }]) }) }) })
      });
      const req = mockReq({ params: { userId: VALID_ID }, query: { page: '1', limit: '10' } });
      const res = mockRes();
      await getUserActivities(req, res, mockNext);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ pagination: expect.any(Object) }));
    });
  });

  describe('bulkCreateActivity', () => {
    it('returns 400 for empty array', async () => {
      const req = mockReq({ body: { activities: [] } });
      await bulkCreateActivity(req, mockRes(), mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it('returns 400 for invalid timestamp', async () => {
      const req = mockReq({ body: { activities: [{ userId: VALID_ID, location: { lat: 1, lng: 1 }, timestamp: 'not-a-date' }] } });
      await bulkCreateActivity(req, mockRes(), mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.anything());
    });

    it('inserts valid bulk activities', async () => {
      ActivityLog.insertMany.mockResolvedValueOnce([{ _id: VALID_ID }]);
      const req = mockReq({ body: { activities: [{ userId: VALID_ID, location: { lat: 1, lng: 1 } }] } });
      const res = mockRes();
      await bulkCreateActivity(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });
});

// ─────────────────────────────────────────────
// MODULE: payoutController
// ─────────────────────────────────────────────
describe('payoutController', () => {
  const { initiatePayout, updatePayoutStatus, getMyPayouts } = require('../controllers/payoutController');
  const Payout = require('../models/Payout');
  const FraudFlag = require('../models/FraudFlag');

  beforeEach(() => jest.clearAllMocks());

  describe('initiatePayout', () => {
    it('returns 400 for missing userId', async () => {
      const req = mockReq({ body: { amount: 100 }, user: { id: VALID_ID, role: 'admin' } });
      await initiatePayout(req, mockRes(), mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it('returns 400 for zero amount', async () => {
      const req = mockReq({ body: { userId: VALID_ID, amount: 0 }, user: { id: VALID_ID, role: 'admin' } });
      await initiatePayout(req, mockRes(), mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it('returns 403 for active fraud flag', async () => {
      FraudFlag.findOne.mockResolvedValueOnce({ _id: VALID_ID, status: 'open' });
      const req = mockReq({ body: { userId: VALID_ID, amount: 100 }, user: { id: VALID_ID, role: 'admin' } });
      await initiatePayout(req, mockRes(), mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    });

    it('returns existing payout on duplicate idempotencyKey', async () => {
      FraudFlag.findOne.mockResolvedValueOnce(null);
      Payout.findOne.mockResolvedValueOnce({ _id: VALID_ID, status: 'pending' });
      const req = mockReq({ body: { userId: VALID_ID, amount: 100, idempotencyKey: 'key-123' }, user: { id: VALID_ID, role: 'admin' } });
      const res = mockRes();
      await initiatePayout(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('creates payout successfully', async () => {
      FraudFlag.findOne.mockResolvedValueOnce(null);
      Payout.findOne.mockResolvedValueOnce(null);
      Payout.create.mockResolvedValueOnce({ _id: VALID_ID, status: 'pending' });
      const req = mockReq({ body: { userId: VALID_ID, amount: 100 }, user: { id: VALID_ID, role: 'admin' } });
      const res = mockRes();
      await initiatePayout(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('updatePayoutStatus', () => {
    it('returns 400 for invalid status', async () => {
      const req = mockReq({ params: { payoutId: VALID_ID }, body: { status: 'invalid' } });
      await updatePayoutStatus(req, mockRes(), mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it('returns 404 if payout not found', async () => {
      Payout.findById.mockResolvedValueOnce(null);
      const req = mockReq({ params: { payoutId: VALID_ID }, body: { status: 'approved' } });
      await updatePayoutStatus(req, mockRes(), mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    });

    it('returns 400 if payout already finalized', async () => {
      Payout.findById.mockResolvedValueOnce({ _id: VALID_ID, status: 'paid' });
      const req = mockReq({ params: { payoutId: VALID_ID }, body: { status: 'approved' } });
      await updatePayoutStatus(req, mockRes(), mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });
  });

  describe('getMyPayouts', () => {
    it('returns payouts for current user', async () => {
      Payout.find.mockReturnValueOnce({ sort: () => Promise.resolve([{ _id: VALID_ID }]) });
      const req = mockReq({ user: { id: VALID_ID, role: 'worker' } });
      const res = mockRes();
      await getMyPayouts(req, res, mockNext);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});

// ─────────────────────────────────────────────
// MODULE: adminController
// ─────────────────────────────────────────────
describe('adminController', () => {
  const { getAllUsers, getFraudFlags, overrideRiskScore } = require('../controllers/adminController');
  const User = require('../models/User');
  const FraudFlag = require('../models/FraudFlag');
  const RiskScore = require('../models/RiskScore');
  const { sendNotification } = require('../services/notificationService');

  beforeEach(() => jest.clearAllMocks());

  describe('getAllUsers', () => {
    it('returns paginated users', async () => {
      User.countDocuments.mockResolvedValueOnce(2);
      User.find.mockReturnValueOnce({ select: () => ({ sort: () => ({ skip: () => ({ limit: () => Promise.resolve([{ _id: VALID_ID }]) }) }) }) });
      const req = mockReq({ query: { page: '1', limit: '10' }, user: { id: VALID_ID, role: 'admin' } });
      const res = mockRes();
      await getAllUsers(req, res, mockNext);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ pagination: expect.any(Object) }));
    });
  });

  describe('overrideRiskScore', () => {
    it('returns 400 for invalid userId', async () => {
      const req = mockReq({ params: { userId: INVALID_ID }, body: { newScore: 50, reason: 'test' }, user: { id: VALID_ID, role: 'admin' } });
      await overrideRiskScore(req, mockRes(), mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it('returns 400 for out-of-range score', async () => {
      const req = mockReq({ params: { userId: VALID_ID }, body: { newScore: 150, reason: 'test' }, user: { id: VALID_ID, role: 'admin' } });
      await overrideRiskScore(req, mockRes(), mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it('returns 400 if reason is missing', async () => {
      const req = mockReq({ params: { userId: VALID_ID }, body: { newScore: 50 }, user: { id: VALID_ID, role: 'admin' } });
      await overrideRiskScore(req, mockRes(), mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it('overrides risk score and sends notification', async () => {
      RiskScore.create.mockResolvedValueOnce({ _id: VALID_ID, score: 50 });
      sendNotification.mockResolvedValueOnce(true);
      const req = mockReq({ params: { userId: VALID_ID }, body: { newScore: 50, reason: 'fraud review' }, user: { id: VALID_ID, role: 'admin' } });
      const res = mockRes();
      await overrideRiskScore(req, res, mockNext);
      expect(sendNotification).toHaveBeenCalledWith(VALID_ID, expect.any(String), expect.any(String), 'system');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });
});

// ─────────────────────────────────────────────
// MODULE: riskController
// ─────────────────────────────────────────────
describe('riskController', () => {
  const { computeRiskScore } = require('../controllers/riskController');
  const ActivityLog = require('../models/ActivityLog');
  const RiskScore = require('../models/RiskScore');
  const { getRiskScore } = require('../services/mlService');

  beforeEach(() => jest.clearAllMocks());

  it('returns 400 for invalid userId', async () => {
    const req = mockReq({ params: { userId: INVALID_ID }, user: { id: VALID_ID, role: 'worker' } });
    await computeRiskScore(req, mockRes(), mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  it('returns 503 if ML service is down', async () => {
    ActivityLog.countDocuments.mockResolvedValueOnce(5);
    getRiskScore.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const req = mockReq({ params: { userId: VALID_ID }, user: { id: VALID_ID, role: 'worker' } });
    await computeRiskScore(req, mockRes(), mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 503 }));
  });

  it('returns 502 if ML returns no risk_score', async () => {
    ActivityLog.countDocuments.mockResolvedValueOnce(5);
    getRiskScore.mockResolvedValueOnce({ some_other_key: 'bad' });
    const req = mockReq({ params: { userId: VALID_ID }, user: { id: VALID_ID, role: 'worker' } });
    await computeRiskScore(req, mockRes(), mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 502 }));
  });

  it('saves risk record and returns score', async () => {
    ActivityLog.countDocuments.mockResolvedValueOnce(10);
    getRiskScore.mockResolvedValueOnce({ risk_score: 0.42 });
    RiskScore.create.mockResolvedValueOnce({ _id: VALID_ID, score: 0.42 });
    const req = mockReq({ params: { userId: VALID_ID }, user: { id: VALID_ID, role: 'worker' } });
    const res = mockRes();
    await computeRiskScore(req, res, mockNext);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, risk_score: 0.42 }));
  });
});

// ─────────────────────────────────────────────
// MODULE: errorHandler middleware
// ─────────────────────────────────────────────
describe('errorHandler middleware', () => {
  const errorHandler = require('../middleware/errorHandler');

  it('responds with correct status and error message', () => {
    const err = new Error('Test error');
    err.statusCode = 422;
    const res = mockRes();
    errorHandler(err, {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Test error' });
  });

  it('defaults to 500 if no statusCode set', () => {
    const err = new Error('Unknown');
    const res = mockRes();
    errorHandler(err, {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
