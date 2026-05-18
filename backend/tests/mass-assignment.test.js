/**
 * Regression tests for mass-assignment protection.
 * Ensures update endpoints only pass whitelisted fields to the database,
 * preventing attackers from overwriting internal fields like parentId,
 * deviceIds, subscriptionStatus, etc.
 */

// Stub mongoose before requiring controllers
jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return {
    ...actual,
    model: jest.fn(() => ({})),
  };
});

jest.mock('../src/models/Child');
jest.mock('../src/models/Rule');
jest.mock('../src/models/Geofence');

const Child = require('../src/models/Child');
const Rule = require('../src/models/Rule');
const Geofence = require('../src/models/Geofence');

const childrenController = require('../src/controllers/childrenController');
const rulesController = require('../src/controllers/rulesController');
const geofenceController = require('../src/controllers/geofenceController');

const { validationResult } = require('express-validator');
jest.mock('express-validator', () => ({
  validationResult: jest.fn(() => ({ isEmpty: () => true, array: () => [] })),
}));

function mockReq(overrides = {}) {
  return {
    user: { _id: 'parent123' },
    params: { id: 'child123', childId: 'child123' },
    body: {},
    app: { get: jest.fn(() => ({ to: () => ({ emit: jest.fn() }) })) },
    ...overrides,
  };
}

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const next = jest.fn();

// ─── childrenController.update ───────────────────────────────────────────────

describe('childrenController.update — mass-assignment protection', () => {
  beforeEach(() => jest.clearAllMocks());

  it('passes only { name, age, avatar } to findOneAndUpdate', async () => {
    Child.findOneAndUpdate = jest.fn().mockResolvedValue({ _id: 'child123', name: 'Test' });

    const req = mockReq({
      body: {
        name: 'Alice',
        age: 8,
        avatar: 'cat',
        // malicious fields
        parentId: 'attacker999',
        subscriptionStatus: 'premium',
        deviceIds: ['d1'],
        _id: 'hijacked',
        __v: 99,
      },
    });

    await childrenController.update(req, mockRes(), next);

    expect(Child.findOneAndUpdate).toHaveBeenCalledTimes(1);
    const [filter, updates] = Child.findOneAndUpdate.mock.calls[0];
    expect(filter).toEqual({ _id: 'child123', parentId: 'parent123' });

    // Only whitelisted keys
    expect(Object.keys(updates)).toEqual(expect.arrayContaining(['name', 'age', 'avatar']));
    expect(updates).not.toHaveProperty('parentId');
    expect(updates).not.toHaveProperty('subscriptionStatus');
    expect(updates).not.toHaveProperty('deviceIds');
    expect(updates).not.toHaveProperty('_id');
    expect(updates).not.toHaveProperty('__v');
  });

  it('omits undefined whitelisted fields', async () => {
    Child.findOneAndUpdate = jest.fn().mockResolvedValue({ _id: 'child123', name: 'Bob' });

    const req = mockReq({ body: { name: 'Bob' } });
    await childrenController.update(req, mockRes(), next);

    const [, updates] = Child.findOneAndUpdate.mock.calls[0];
    expect(updates).toEqual({ name: 'Bob' });
    expect(updates).not.toHaveProperty('age');
    expect(updates).not.toHaveProperty('avatar');
  });
});

// ─── rulesController — screen time, apps, web filter ─────────────────────────

describe('rulesController — mass-assignment protection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Child.findOne = jest.fn().mockResolvedValue({ _id: 'child123' });
  });

  it('setScreenTime only sets screenTime sub-fields', async () => {
    const fakeRules = { childId: 'child123', screenTime: {} };
    Rule.findOneAndUpdate = jest.fn().mockResolvedValue(fakeRules);
    const Device = require('../src/models/Device');
    jest.mock('../src/models/Device', () => ({ find: jest.fn().mockResolvedValue([]) }));

    const req = mockReq({
      body: {
        dailyLimitMin: 60,
        perApp: [],
        schedule: [],
        // malicious
        childId: 'hijacked',
        _id: 'xxx',
        blockedApps: ['*'],
      },
    });

    await rulesController.setScreenTime(req, mockRes(), next);

    const [, update] = Rule.findOneAndUpdate.mock.calls[0];
    const setFields = update.$set;
    expect(Object.keys(setFields)).toEqual([
      'screenTime.dailyLimitMin',
      'screenTime.perApp',
      'screenTime.schedule',
    ]);
    expect(setFields).not.toHaveProperty('childId');
    expect(setFields).not.toHaveProperty('_id');
    expect(setFields).not.toHaveProperty('blockedApps');
  });

  it('setApps only sets blockedApps', async () => {
    Rule.findOneAndUpdate = jest.fn().mockResolvedValue({});

    const req = mockReq({
      body: {
        blockedApps: ['com.evil.app'],
        // malicious
        childId: 'hijacked',
        screenTime: { dailyLimitMin: 0 },
      },
    });

    await rulesController.setApps(req, mockRes(), next);

    const [, update] = Rule.findOneAndUpdate.mock.calls[0];
    expect(Object.keys(update.$set)).toEqual(['blockedApps']);
  });

  it('setWebFilter only sets webFilter sub-fields', async () => {
    Rule.findOneAndUpdate = jest.fn().mockResolvedValue({});

    const req = mockReq({
      body: {
        categories: ['adult'],
        customBlock: ['bad.com'],
        customAllow: ['good.com'],
        // malicious
        childId: 'hijacked',
        blockedApps: ['*'],
      },
    });

    await rulesController.setWebFilter(req, mockRes(), next);

    const [, update] = Rule.findOneAndUpdate.mock.calls[0];
    const setFields = update.$set;
    expect(Object.keys(setFields)).toEqual([
      'webFilter.categories',
      'webFilter.customBlock',
      'webFilter.customAllow',
    ]);
  });
});

// ─── geofenceController.update ───────────────────────────────────────────────

describe('geofenceController.update — mass-assignment protection', () => {
  beforeEach(() => jest.clearAllMocks());

  it('only updates whitelisted geofence fields', async () => {
    const saveMock = jest.fn().mockResolvedValue(true);
    const fakeGeofence = {
      _id: 'geo1',
      parentId: 'parent123',
      childId: 'child123',
      name: 'School',
      lat: 47.9,
      lng: 106.9,
      radiusMeters: 200,
      alertOnEntry: true,
      alertOnExit: true,
      active: true,
      childrenInside: [],
      lastEnteredAt: null,
      lastExitedAt: null,
      save: saveMock,
    };

    Geofence.findOne = jest.fn().mockResolvedValue(fakeGeofence);

    const req = mockReq({
      body: {
        name: 'Home',
        lat: 48.0,
        // malicious
        parentId: 'attacker',
        childId: 'hijacked',
        childrenInside: ['fake'],
        lastEnteredAt: '2020-01-01',
        lastExitedAt: '2020-01-01',
        _id: 'xxx',
      },
    });

    await geofenceController.update(req, mockRes(), next);

    expect(saveMock).toHaveBeenCalled();
    // Whitelisted fields updated
    expect(fakeGeofence.name).toBe('Home');
    expect(fakeGeofence.lat).toBe(48.0);
    // Internal fields NOT overwritten
    expect(fakeGeofence.parentId).toBe('parent123');
    expect(fakeGeofence.childId).toBe('child123');
    expect(fakeGeofence.childrenInside).toEqual([]);
    expect(fakeGeofence.lastEnteredAt).toBeNull();
    expect(fakeGeofence.lastExitedAt).toBeNull();
    expect(fakeGeofence._id).toBe('geo1');
  });
});
