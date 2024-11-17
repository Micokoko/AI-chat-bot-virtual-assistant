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
<div className="flex justify-center items-center h-screen m-4 mb-4 bg-gray-900">
  <div className="bg-gray-800 rounded-lg shadow-xl h-full w-full max-w-4xl space-y-6">
    <div className="flex flex-col md:flex-row w-full h-full space-y-6 md:space-y-0">
      {/* Chat Section */}
      <div className="md:w-1/2 p-4 min-h-96 bg-gray-800 rounded-lg shadow-md flex flex-col space-y-4 border border-gray-700">
        <div ref={chatFeedRef} className="flex flex-col space-y-4 flex-grow text-left overflow-auto">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.fromUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs p-3 rounded-lg ${msg.fromUser ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
                {msg.text}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-xs p-3 rounded-lg bg-gray-700 text-gray-300">
                <div className="flex justify-center items-center space-x-2">
                  <div className="w-3 h-3 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>AI is typing...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center mt-4 space-x-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message"
            className="w-full p-3 rounded-lg border-2 border-gray-700 focus:outline-none focus:border-blue-500 bg-gray-900 text-white"
          />
          <button
            onClick={handleSend}
            className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none"
          >
            Send
          </button>
        </div>
      </div>

      {/* Task List Section */}
      <div className="md:w-1/2 p-4 bg-gray-800 rounded-lg shadow-md flex flex-col space-y-4 border border-gray-700">
        <h1 className="text-2xl font-extrabold mb-2 text-white">TASK LIST</h1>
        <div className="flex flex-col space-y-6 flex-grow">
          {/* To-Do Section */}
          <div className="border-b border-gray-700 pb-32">
            <h2 className="text-xl font-semibold mb-2 text-white">To-Do</h2>
            <div className="h-64 overflow-y-scroll">
              {todoList.todo.length === 0 ? (
                <p className="text-gray-400">No existing entries</p>
              ) : (
                <table className="text-left w-full table-auto text-white">
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
                            className="bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                          >
                            Complete
                          </button>
                          <button
                            onClick={() => handleDelete(task)}
                            className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
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
          <div className="border-t border-gray-700 pt-4">
            <h2 className="text-xl font-semibold mb-2 text-white">Completed</h2>
            <div className="h-64 overflow-y-scroll">
              {todoList.completed.length === 0 ? (
                <p className="text-gray-400">No existing entries</p>
              ) : (
                <table className="text-left w-full table-auto text-white">
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
                            className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
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
