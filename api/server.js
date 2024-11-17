const express = require('express');
const axios = require('axios');
const session = require('express-session');
require('dotenv').config();
const cors = require('cors');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'https://miraibot-gamma.vercel.app/', // Replace with your frontend origin
  credentials: true, // Allow cookies to be sent from the client
}));
app.use(express.json());

// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET || `${process.env.OPENAI_API_KEY}`, // Replace with a strong secret
  resave: false, // Avoid resaving session if nothing has changed
  saveUninitialized: true, // Save uninitialized sessions
  cookie: {
    httpOnly: true, // Prevent client-side script access
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    maxAge: 24 * 60 * 60 * 1000, // Set cookie expiry to 1 day
  },
}));

// Task state to maintain a simple in-memory store
const taskState = {
  todo: [], // Tasks that need to be done
  completed: [], // Tasks that have been completed
};

// Route for AI-powered task management
app.post('/chat', async (req, res) => {
  const userMessage = req.body.message;

  // Validate input
  if (!userMessage || typeof userMessage !== 'string') {
    return res.status(400).json({ error: 'Invalid input message' });
  }

  // Retrieve or initialize session conversation history
  if (!req.session.conversationHistory) {
    req.session.conversationHistory = [];
  }

  try {
    // System prompt to provide task state context and allow conversational flow
    const systemPrompt = {
      role: 'system',
      content: `You are a friendly and helpful assistant. 
      Here is the current task state:
      - To-Do Tasks: ${taskState.todo.length > 0 ? taskState.todo.join(', ') : 'None'}
      - Completed Tasks: ${taskState.completed.length > 0 ? taskState.completed.join(', ') : 'None'}
      Instructions:
      - If the user asks to add a task, respond with: "Add task: [Task description]". 
      - If the user asks to complete a task, respond with: "Complete task: [Task description]". 
      - If the user mentions anything related to tasks, confirm or guide them accordingly, and avoid duplicating tasks.
      - For questions or statements unrelated to tasks, engage conversationally and keep track of the ongoing conversation.`
    };

    // Add the system prompt and user message to the conversation history
    req.session.conversationHistory.push({ role: 'user', content: userMessage });

    // Limit the history length
    const MAX_HISTORY_LENGTH = 50;
    if (req.session.conversationHistory.length > MAX_HISTORY_LENGTH) {
      req.session.conversationHistory = req.session.conversationHistory.slice(-MAX_HISTORY_LENGTH);
    }

    // Prepare messages for OpenAI, including the entire chat history for context
    const messages = [systemPrompt, ...req.session.conversationHistory];

    // Make OpenAI API call
    const openaiResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: messages,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Extract AI response
    const aiResponse = openaiResponse.data.choices[0].message.content.trim();

    // Add the AI response to the conversation history
    req.session.conversationHistory.push({ role: 'assistant', content: aiResponse });

    // Check if the AI response contains instructions to add or complete a task
    let task;
    if (aiResponse.toLowerCase().startsWith('add task:')) {
      // Extract task description from the response
      task = aiResponse.replace(/^Add task:\s*/i, '').trim();

      // Avoid adding duplicate tasks
      if (!taskState.todo.includes(task) && !taskState.completed.includes(task)) {
        taskState.todo.push(task); // Add the task to the to-do list
        return res.json({ message: `Task added successfully: ${task}`, task, completed: false });
      } else {
        return res.json({ message: `Task "${task}" already exists.` });
      }
    } else if (aiResponse.toLowerCase().startsWith('complete task:')) {
      // Extract task description to mark it as complete
      task = aiResponse.replace(/^Complete task:\s*/i, '').trim();

      // Mark task as completed if it exists in the to-do list
      if (taskState.todo.includes(task)) {
        taskState.todo = taskState.todo.filter((t) => t !== task); // Remove task from to-do list
        taskState.completed.push(task); // Add it to completed tasks
        return res.json({ message: `Task marked as completed: ${task}`, task, completed: true });
      } else {
        return res.json({ message: `Task "${task}" not found in the to-do list.` });
      }
    } else {
      // Handle non-task related inquiries or conversational flow
      return res.json({ message: aiResponse });
    }
  } catch (error) {
    console.error('Error communicating with OpenAI:', error.response ? error.response.data : error.message);
    return res.status(500).json({ error: 'Error communicating with the AI' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
