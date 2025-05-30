import { useEffect, useState, useRef } from 'react';
import { Paperclip, Send, Check, CheckCheck } from 'lucide-react';
import Cookies from 'js-cookie';

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

type MessageContentType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE' | 'OTHERS';
interface Message {
    id?: bigint;
    conversationId: bigint;
    senderId: bigint;
    body?: string;
    contentType?: MessageContentType;
    fileUrl?: string;
    mimeType?: string;
    attachments?: attachment[];
    createdAt?: Date;
    readAt?: Date;
}

interface attachment {
    url: string;
    mimeType: string;
    width?: number;
    height?: number;
    sizeBytes?: number;
}

interface WebSocketMessage {
    type:
    | "online"
    | "offline"
    | "is_typing"
    | "send_message"
    | "is_read";
    payload: {
        conversationId?: string;
        senderId?: string;
        messageIds?: string[];
        token?: string;
    };
}


const initialMessages: Message[] = [
    {
        id: BigInt(1),
        conversationId: BigInt(1),
        senderId: BigInt(1),
        body: "Hey! How's your day going?",
        contentType: "TEXT",
        attachments: []
    },
    {
        id: BigInt(2),
        conversationId: BigInt(1),
        senderId: BigInt(2),
        body: "Pretty good! Just finished the presentation. How about you?",
        contentType: "TEXT",
        attachments: []
    },
    {
        id: BigInt(3),
        conversationId: BigInt(1),
        senderId: BigInt(1),
        body: "That's great! I'm working on the new project proposal",
        contentType: "TEXT",
        attachments: []
    },
    {
        id: BigInt(4),
        conversationId: BigInt(1),
        senderId: BigInt(2),
        body: "Sounds interesting! Would love to hear more about it when you're ready",
        contentType: "TEXT",
        attachments: []
    },
    {
        id: BigInt(5),
        conversationId: BigInt(1),
        senderId: BigInt(1),
        body: "Are we still meeting tomorrow at 3 PM?",
        contentType: "TEXT",
        attachments: []
    },
    {
        id: BigInt(6),
        conversationId: BigInt(1),
        senderId: BigInt(2),
        body: "Yes, absolutely! See you at 3 PM sharp.",
        contentType: "TEXT",
        attachments: []
    }
];

const ChatWidget = () => {
    const [selectedFriend, setSelectedFriend] = useState<Participant | null>(null);
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [messageInput, setMessageInput] = useState('');
    const [user, setUser] = useState<{ id: number; name: string } | null>(null);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        fetch(`${import.meta.env.VITE_API_URL}/conversations/1/1`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Cookies.get('token')}`
            }
        }).then((response) => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        }).then((data) => {
            console.log(data);
            setUser(data.user);
        }).catch((error) => {
            console.error('Error fetching user data:', error);
        });
    }, []);

    useEffect(() => {
        if (wsRef.current) {
            return;
        }

        const token = Cookies.get('token');
        wsRef.current = new WebSocket(`${import.meta.env.VITE_WS_URL}?token=${token}`);

        wsRef.current.onopen = () => {
            console.log('WebSocket connection established');
            wsRef.current?.send(JSON.stringify({
                type: 'online',
                payload: {
                    conversationId: '1',
                    senderId: user?.id.toString() || '1',
                }
            } as WebSocketMessage));
        };

        wsRef.current.onmessage = (event) => {
            const messageData = JSON.parse(event.data);
            console.log('Received message:', messageData);
        };

        wsRef.current.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        wsRef.current.onclose = (event) => {
            console.log('WebSocket connection closed:', event);
        };

        return () => {
            wsRef.current?.close();
            wsRef.current = null;
        };
    }, []);

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
            conversationId: BigInt(1),
            senderId: BigInt(1),
            body: messageInput,
            contentType: "TEXT",
            attachments: []
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
                                        {(user?.name || "John").charAt(0).toUpperCase()}
                                    </div>
                                    {selectedFriend.online
                                        ? (<div className="absolute bottom-0 -right-1 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>)
                                        : (<div className="absolute bottom-0 -right-1 w-3 h-3 bg-red-400 border-2 border-white rounded-full"></div>)
                                    }
                                </div>
                                <div className="ml-3">
                                    <h2 className="text-lg font-semibold text-gray-900">
                                        {user?.name}
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
                                    className={`flex ${message.senderId === BigInt(user?.id || -1) ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${message.senderId === BigInt(user?.id || -1)
                                            ? 'bg-blue-500 text-white border border-blue-900'
                                            : 'bg-white text-gray-900 border border-black'
                                            }`}
                                    >
                                        <p className="text-sm">{message.body}</p>
                                        <div className="flex items-center justify-end mt-1">
                                            <p
                                                className={`text-xs ${message.senderId === BigInt(user?.id || -1) ? 'text-blue-100' : 'text-gray-500'
                                                    }`}
                                            >
                                                {message.createdAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            {message.senderId == BigInt(user?.id || -1) && (
                                                <ReadTicks read={message.readAt ? message.readAt < new Date() : false} />
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