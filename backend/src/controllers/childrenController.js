const { validationResult } = require('express-validator');
const Child = require('../models/Child');
const Rule = require('../models/Rule');

exports.create = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, age, avatar } = req.body;
    const child = await Child.create({
      name,
      age,
      avatar,
      parentId: req.user._id,
    });

    // Create default rules for the child
    await Rule.create({ childId: child._id });

    res.status(201).json(child);
  } catch (err) {
    next(err);
  }
};

exports.list = async (req, res, next) => {
  try {
    const children = await Child.find({ parentId: req.user._id });
    res.json(children);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const child = await Child.findOneAndUpdate(
      { _id: req.params.id, parentId: req.user._id },
      req.body,
      { new: true, runValidators: true },
    );

    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    res.json(child);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const child = await Child.findOneAndDelete({
      _id: req.params.id,
      parentId: req.user._id,
    });

    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    // Clean up associated rules
    await Rule.deleteOne({ childId: child._id });

    res.json({ message: 'Child profile removed' });
  } catch (err) {
    next(err);
  }
};
