const chatService = require('../services/chat.service');

async function listConversations(req, res, next) {
  try {
    const data = await chatService.listConversations(req.user.id, req.user.role);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function getMessages(req, res, next) {
  try {
    const data = await chatService.getMessages(req.params.orderId, req.user.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function sendMessage(req, res, next) {
  try {
    const data = await chatService.sendMessage(req.params.orderId, req.user.id, req.body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

module.exports = { listConversations, getMessages, sendMessage };
