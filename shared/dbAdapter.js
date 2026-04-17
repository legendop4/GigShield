const mongoose = require('mongoose');

// Native Memory Store — singleton across require() calls
global.DB = typeof global.DB !== 'undefined' ? global.DB : {
  User: [],
  Payout: [],
  FraudFlag: [],
  RiskScore: [],
  ActivityLog: [],
  Notification: [],
  TokenBlacklist: [],
  TriggerEvent: []
};

const isMongo = () => {
  // Only delegate to Mongoose if we have a URI AND Mongoose is actually connected
  if (!process.env.MONGO_URI || process.env.MONGO_URI === 'undefined') return false;
  return mongoose.connection.readyState === 1;
};

const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 6);

// ─── Query Matching Engine ───────────────────────────────────────────────────
const matchesQuery = (item, query) => {
    if (!query || Object.keys(query).length === 0) return true;
    if (query.$or) {
        return query.$or.some(q => matchesQuery(item, q));
    }
    return Object.keys(query).every(k => {
        if (k === '$or') return true;
        const qVal = query[k];
        const iVal = item[k];
        if (qVal && typeof qVal === 'object' && !Array.isArray(qVal) && !(qVal instanceof Date)) {
            if (qVal.$in) return qVal.$in.map(String).includes(String(iVal));
            if (qVal.$gte) return new Date(iVal) >= new Date(qVal.$gte);
            if (qVal.$gt) return new Date(iVal) > new Date(qVal.$gt);
            if (qVal.$ne) return String(iVal) !== String(qVal.$ne);
            if (qVal.$regex) return new RegExp(qVal.$regex, qVal.$options || '').test(iVal);
        }
        // Compare as strings to handle ObjectId-vs-string mismatches
        return String(iVal) === String(qVal);
    });
};

// ─── Chainable MockQuery (mirrors Mongoose Query API) ────────────────────────
class MockQuery {
    constructor(collectionName, data, resolveAs = 'many') {
        this.collectionName = collectionName;
        // Always store as array internally for sort/limit to work
        this._data = Array.isArray(data) ? [...data] : (data ? [data] : []);
        this.resolveAs = resolveAs; // 'one' | 'many'
    }

    sort(sortObj) {
        if (this._data.length === 0) return this;
        const key = Object.keys(sortObj)[0];
        const dir = sortObj[key];
        this._data.sort((a, b) => {
            const aVal = a[key] instanceof Date ? a[key].getTime() : (typeof a[key] === 'string' ? new Date(a[key]).getTime() || a[key] : a[key]);
            const bVal = b[key] instanceof Date ? b[key].getTime() : (typeof b[key] === 'string' ? new Date(b[key]).getTime() || b[key] : b[key]);
            if (aVal < bVal) return dir === -1 ? 1 : -1;
            if (aVal > bVal) return dir === -1 ? -1 : 1;
            return 0;
        });
        return this;
    }

    limit(num) {
        if (this._data.length === 0) return this;
        this._data = this._data.slice(0, num);
        return this;
    }

    skip(num) {
        if (this._data.length === 0) return this;
        this._data = this._data.slice(num);
        return this;
    }

    select(fields) {
        // In-memory: we just return everything (no projection needed for demo)
        return this;
    }

    populate(field, props) {
        if (this._data.length === 0) return this;
        const targetCollection = 'User';

        const doPopulate = (doc) => {
            if (!doc || !doc[field]) return doc;
            const copy = { ...doc };
            const refDoc = global.DB[targetCollection].find(u => String(u._id) === String(copy[field]));
            if (refDoc && props) {
                const fieldList = props.split(' ');
                const populated = { _id: refDoc._id };
                fieldList.forEach(f => { if (refDoc[f] !== undefined) populated[f] = refDoc[f]; });
                copy[field] = populated;
            } else if (refDoc) {
                copy[field] = { ...refDoc };
            }
            return copy;
        };

        this._data = this._data.map(d => doPopulate(d));
        return this;
    }

    lean() { return this; }
    exec() { return this; }

    // Make MockQuery a thenable so `await` works
    then(resolve, reject) {
        try {
            if (this.resolveAs === 'one') {
                resolve(this._data[0] || null);
            } else {
                resolve(this._data || []);
            }
        } catch (e) {
            if (reject) reject(e);
        }
    }
}

// ─── Create a saveable document (mutates the global store in-place) ──────────
function makeSaveableDoc(collectionName, data) {
    const doc = {
        _id: data._id || generateId(),
        createdAt: data.createdAt || new Date(),
        updatedAt: data.updatedAt || new Date(),
        ...data,
    };

    doc.save = async function () {
        // Find the index in global.DB and update it in-place
        const idx = global.DB[collectionName].findIndex(d => String(d._id) === String(this._id));
        if (idx !== -1) {
            // Preserve the save function reference
            const saveFn = this.save;
            global.DB[collectionName][idx] = { ...this, save: saveFn };
        }
        return this;
    };

    return doc;
}

// ─── Model Wrapper Factory ───────────────────────────────────────────────────
function getModel(collectionName, MongooseModel) {
    return {
        findOne: (query) => {
            if (isMongo()) return MongooseModel.findOne(query);
            // Return ALL matches so .sort() can work, then resolve first
            const matches = global.DB[collectionName]
                .filter(item => matchesQuery(item, query))
                .map(item => makeSaveableDoc(collectionName, { ...item }));
            return new MockQuery(collectionName, matches, 'one');
        },

        findById: (id) => {
            if (isMongo()) return MongooseModel.findById(id);
            const res = global.DB[collectionName].find(item => String(item._id) === String(id));
            if (res) {
                const doc = makeSaveableDoc(collectionName, { ...res });
                return new MockQuery(collectionName, [doc], 'one');
            }
            return new MockQuery(collectionName, [], 'one');
        },

        find: (query) => {
            if (isMongo()) return MongooseModel.find(query);
            const res = global.DB[collectionName].filter(item => matchesQuery(item, query || {}));
            return new MockQuery(collectionName, res, 'many');
        },

        create: async (data) => {
            if (isMongo()) return await MongooseModel.create(data);
            const doc = makeSaveableDoc(collectionName, data);
            global.DB[collectionName].push(doc);
            return doc;
        },

        insertMany: async (dataArray) => {
            if (isMongo()) return await MongooseModel.insertMany(dataArray);
            const docs = dataArray.map(d => {
                const doc = makeSaveableDoc(collectionName, d);
                global.DB[collectionName].push(doc);
                return doc;
            });
            return docs;
        },

        deleteMany: async (query) => {
            if (isMongo()) return await MongooseModel.deleteMany(query);
            const before = global.DB[collectionName].length;
            if (!query || Object.keys(query).length === 0) {
                global.DB[collectionName] = [];
            } else {
                global.DB[collectionName] = global.DB[collectionName].filter(item => !matchesQuery(item, query));
            }
            return { deletedCount: before - global.DB[collectionName].length };
        },

        countDocuments: async (query) => {
            if (isMongo()) return await MongooseModel.countDocuments(query);
            if (!query || Object.keys(query).length === 0) return global.DB[collectionName].length;
            return global.DB[collectionName].filter(item => matchesQuery(item, query)).length;
        },

        aggregate: async (pipeline) => {
            if (isMongo()) return await MongooseModel.aggregate(pipeline);
            // Minimal aggregate support for the getDashboardStats $match + $group pattern
            let docs = [...global.DB[collectionName]];
            for (const stage of pipeline) {
                if (stage.$match) {
                    docs = docs.filter(d => matchesQuery(d, stage.$match));
                }
                if (stage.$group) {
                    const group = stage.$group;
                    const result = { _id: group._id };
                    for (const [key, op] of Object.entries(group)) {
                        if (key === '_id') continue;
                        if (op.$sum) {
                            const field = op.$sum.replace('$', '');
                            result[key] = docs.reduce((acc, d) => acc + (d[field] || 0), 0);
                        }
                        if (op.$count) {
                            result[key] = docs.length;
                        }
                    }
                    return [result];
                }
            }
            return docs;
        },
    };
}

module.exports = getModel;
