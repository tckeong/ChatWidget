import { useEffect, useState } from 'react';
import { Paperclip, Send, Check, CheckCheck } from 'lucide-react';

type RoleType = 'customer' | 'agent';

interface Participant {
    id: number;
    role: RoleType;
    name: string;
    lastMessage: string;
    time: string;
    unread?: number;
    online?: boolean;
}

interface Message {
    id: number;
    text: string;
    time: string;
    sent: boolean; // true if sent by the user, false if received
    read: boolean;
}

const initialMessages: Message[] = [
    {
        id: 1,
        text: "Hey! How's your day going?",
        time: "2:30 PM",
        sent: false,
        read: false
    },
    {
        id: 2,
        text: "Pretty good! Just finished the presentation. How about you?",
        time: "2:32 PM",
        sent: true,
        read: true
    },
    {
        id: 3,
        text: "That's great! I'm working on the new project proposal",
        time: "2:33 PM",
        sent: false,
        read: false
    },
    {
        id: 4,
        text: "Sounds interesting! Would love to hear more about it when you're ready",
        time: "2:35 PM",
        sent: true,
        read: true
    },
    {
        id: 5,
        text: "Are we still meeting tomorrow at 3 PM?",
        time: "2:45 PM",
        sent: false,
        read: false
    },
    {
        id: 6,
        text: "Yes, absolutely! See you at 3 PM sharp.",
        time: "2:46 PM",
        sent: true,
        read: false
    }
];


const ChatWidget = () => {
    const [selectedFriend, setSelectedFriend] = useState<Participant | null>(null);
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [messageInput, setMessageInput] = useState('');

    useEffect(() => {
        const participant = {
            id: 1,
            role: 'customer' as RoleType,
            name: 'John Doe',
            lastMessage: 'Are we still meeting tomorrow at 3 PM?',
            time: '2:45 PM',
            unread: 2,
            online: true,
        };

        setSelectedFriend(participant); // Set default selected friend
    }, []);

    const ReadTicks = ({ read }: { read: boolean }) => {
        return (
            <div className="flex items-center ml-1">
                {read ? (
                    // Double tick for read messages
                    <div className="flex">
                        <CheckCheck className="w-3 h-3 text-blue-300" />
                    </div>
                ) : (
                    // Single tick for sent but not read
                    <Check className="w-3 h-3 text-blue-200" />
                )}
            </div>
        );
    };

    const handleMessageSend = () => {
        if (messageInput.trim() === '') return;

        // Simulate sending a message
        const newMessage: Message = {
            id: messages.length + 1,
            text: messageInput,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            sent: true,
            read: false, // Initially not read
        };

        setMessages([...messages, newMessage]);
        setMessageInput(''); // Clear input after sending
    };

    return (
        <div className="flex h-screen bg-gray-100">
            <div className="flex-1 flex flex-col">
                {selectedFriend ? (
                    <>
                        {/* Chat Header */}
                        <div className="bg-white border-b border-gray-500 px-6 py-4">
                            <div className="flex items-center">
                                <div className="ml-5 relative">
                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                                        {selectedFriend.name.charAt(0).toUpperCase()}
                                    </div>
                                    {selectedFriend.online
                                        ? (<div className="absolute bottom-0 -right-1 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>)
                                        : (<div className="absolute bottom-0 -right-1 w-3 h-3 bg-red-400 border-2 border-white rounded-full"></div>)
                                    }
                                </div>
                                <div className="ml-3">
                                    <h2 className="text-lg font-semibold text-gray-900">
                                        {selectedFriend.name}
                                    </h2>
                                    <p className="text-sm text-gray-500">
                                        {selectedFriend.online ? 'online' : 'offline'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-100">
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex ${message.sent ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${message.sent
                                            ? 'bg-blue-500 text-white border border-blue-900'
                                            : 'bg-white text-gray-900 border border-black'
                                            }`}
                                    >
                                        <p className="text-sm">{message.text}</p>
                                        <div className="flex items-center justify-end mt-1">
                                            <p
                                                className={`text-xs ${message.sent ? 'text-blue-100' : 'text-gray-500'
                                                    }`}
                                            >
                                                {message.time}
                                            </p>
                                            {message.sent && (
                                                <ReadTicks read={message.read} />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Message Input */}
                        <div className="bg-gray-100 border-t border-gray-500 p-4">
                            <div className="flex items-center space-x-3">
                                <button className="p-2 hover:bg-gray-100 rounded-full hover:cursor-pointer">
                                    <Paperclip className="w-5 h-5 text-gray-600" />
                                </button>

                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        placeholder="Write a message..."
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <button className="p-3 bg-blue-500 hover:bg-blue-600 rounded-full" onClick={handleMessageSend}>
                                    <Send className="w-5 h-5 text-white" />
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    /* Welcome Screen */
                    <div className="flex-1 flex items-center justify-center bg-gray-50">
                        <div className="text-center">
                            <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto mb-6">
                                T
                            </div>
                            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                                Welcome to Telegram
                            </h2>
                            <p className="text-gray-600">
                                Select a chat to start messaging
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatWidget;