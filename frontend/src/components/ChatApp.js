import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

function ChatApp() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [todoList, setTodoList] = useState({
    todo: [],
    completed: [],
  });
  const [isLoading, setIsLoading] = useState(false); // Added loading state

  const chatFeedRef = useRef(null);

  useEffect(() => {
    const savedTasks = loadFromLocalStorage();
    setTodoList(savedTasks);

    setMessages([{
      text: 'Hi there! I can help you manage your tasks. What would you like to do?', fromUser: false
    }]);
  }, []);

  const saveToLocalStorage = (tasks) => {
    try {
      localStorage.setItem('todoList', JSON.stringify(tasks));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  const loadFromLocalStorage = () => {
    try {
      const savedTasks = localStorage.getItem('todoList');
      return savedTasks ? JSON.parse(savedTasks) : { todo: [], completed: [] };
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      return { todo: [], completed: [] };
    }
  };

  useEffect(() => {
    if (chatFeedRef.current) {
      chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (message.trim()) {
      setMessages((prevMessages) => [...prevMessages, { text: message, fromUser: true }]);
      setMessage('');
      setIsLoading(true); // Show loader

      try {
        const response = await axios.post('https://ai-chat-bot-virtual-assistant.onrender.com/chat', {
          message: message,
        });

        const aiMessage = response.data.message;
        const task = response.data.task;
        const isCompleted = response.data.completed;

        if (task) {
          const updatedTodoList = { ...todoList };

          if (isCompleted) {
            updatedTodoList.todo = updatedTodoList.todo.filter((t) => t !== task);
            updatedTodoList.completed.push(task);
          } else if (!updatedTodoList.todo.includes(task)) {
            updatedTodoList.todo.push(task);
          }

          setTodoList(updatedTodoList);
          saveToLocalStorage(updatedTodoList);
        }

        // Hide loader and show AI response
        setMessages((prevMessages) => [
          ...prevMessages,
          { text: aiMessage, fromUser: false },
        ]);
      } catch (error) {
        console.error('Error communicating with the AI:', error);
        setMessages((prevMessages) => [
          ...prevMessages,
          { text: 'Sorry, there was an error. Please try again.', fromUser: false },
        ]);
      } finally {
        setIsLoading(false); 
      }
    }
  };

  const handleComplete = (task) => {
    const updatedTodoList = {
      todo: todoList.todo.filter((t) => t !== task),
      completed: [...todoList.completed, task],
    };
    setTodoList(updatedTodoList);
    saveToLocalStorage(updatedTodoList);
  };

  const handleDelete = (task) => {
    const updatedTodoList = {
      todo: todoList.todo.filter((t) => t !== task),
      completed: todoList.completed.filter((t) => t !== task),
    };
    setTodoList(updatedTodoList);
    saveToLocalStorage(updatedTodoList);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="flex justify-center items-center h-1/2 m-4 mb-4">
      <div className="bg-white rounded-lg shadow-xl h-full w-full max-w-4xl space-y-6">
        <div className="flex flex-col md:flex-row w-full h-full space-y-6 md:space-y-0">
          {/* Chat Feed */}
          <div className="md:w-1/2 p-4 h-auto overflow-y-hidden bg-white rounded-lg shadow-md flex flex-col space-y-4 border border-gray-300">
            <div
              ref={chatFeedRef}
              className="flex flex-col h-64 space-y-4 overflow-y-scroll flex-grow text-left"
            >
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.fromUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs p-3 rounded-lg ${msg.fromUser ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-900'}`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {/* Show loader if AI is processing */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-xs p-3 rounded-lg bg-gray-200 text-gray-900">
                    <div className="flex justify-center items-center space-x-2">
                      <div className="w-3 h-3 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>AI is typing...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Section */}
            <div className="flex items-center mt-4 space-x-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message"
                className="w-full p-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleSend}
                className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none"
              >
                Send
              </button>
            </div>
          </div>

          {/* Task List */}
          <div className="md:w-1/2 p-4 bg-white rounded-lg shadow-md flex flex-col space-y-4 border border-gray-300">
            <h1 className="text-2xl font-extrabold mb-2">TASK LIST</h1>
            <div className="flex flex-col space-y-6 flex-grow">
              {/* To-Do Section */}
              <div className="border-b border-gray-300 pb-32">
                <h2 className="text-xl font-semibold mb-2">To-Do</h2>
                <div className="h-64 overflow-y-scroll bg-gray-50">
                  {todoList.todo.length === 0 ? (
                    <p>No existing entries</p>
                  ) : (
                    <table className="text-left w-full table-auto">
                      <thead>
                        <tr>
                          <th className="text-left p-2">Task Description</th>
                          <th className="text-center p-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {todoList.todo.map((task, index) => (
                          <tr key={index}>
                            <td className="p-2">{task}</td>
                            <td className="p-2 space-x-2 text-center">
                              <button
                                onClick={() => handleComplete(task)}
                                className="bg-green-500 text-white px-2 py-1 rounded"
                              >
                                Complete
                              </button>
                              <button
                                onClick={() => handleDelete(task)}
                                className="bg-red-500 text-white px-2 py-1 rounded"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Completed Section */}
              <div className="border-t border-gray-300 pt-4">
                <h2 className="text-xl font-semibold mb-2">Completed</h2>
                <div className="h-64 overflow-y-scroll bg-gray-50">
                  {todoList.completed.length === 0 ? (
                    <p>No existing entries</p>
                  ) : (
                    <table className="text-left w-full table-auto">
                      <thead>
                        <tr>
                          <th className="text-left p-2">Task Description</th>
                          <th className="text-left p-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {todoList.completed.map((task, index) => (
                          <tr key={index}>
                            <td className="p-2">{task}</td>
                            <td className="p-2 space-x-2">
                              <button
                                onClick={() => handleDelete(task)}
                                className="bg-red-500 text-white px-2 py-1 rounded"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatApp;
