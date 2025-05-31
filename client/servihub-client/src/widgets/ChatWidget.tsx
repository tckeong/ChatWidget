import { useEffect, useState, useRef } from 'react';
import { Check, CheckCheck } from 'lucide-react';
import FilePickerWidget from './FilePickeWIdget';
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

export interface attachment {
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

const ChatWidget = () => {
    const [participant, setParticipant] = useState<Participant | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messageInput, setMessageInput] = useState('');
    const [user, setUser] = useState<{ id: number; name: string } | null>(null);
    const [conversationId, setConversationId] = useState<BigInt | null>(null);
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
            setUser(data.user);
            setMessages(data.messages.messages.map((msg: any) => {
                return {
                    ...msg,
                    id: BigInt(msg.id),
                    conversationId: BigInt(msg.conversationId),
                    senderId: BigInt(msg.senderId),
                    createdAt: new Date(msg.createdAt),
                    readAt: msg.readAt ? new Date(msg.readAt) : undefined
                } as Message;
            }));
            setConversationId(BigInt(data.conversations[0].id));
        }).catch((error) => {
            console.error('Error fetching user data:', error);
        });
    }, []);

    useEffect(() => {
        if (wsRef.current) {
            return;
        }

        const token = Cookies.get('token');
        wsRef.current = new WebSocket(`${import.meta.env.VITE_WS_URL}?token=${token}&conversationId=${conversationId?.toString() || ''}`);

        wsRef.current.onopen = () => {
            wsRef.current?.send(JSON.stringify({
                type: 'online',
                payload: {
                    conversationId: conversationId?.toString() || '',
                    senderId: user?.id.toString() || '',
                }
            } as WebSocketMessage));

            let isReadyMessages = [];

            for (let i = 0; i < messages.length; i++) {
                if (!messages[i].readAt) {
                    messages[i].readAt = new Date();
                    isReadyMessages.push(messages[i].id?.toString() || '');
                }
            }

            if (isReadyMessages.length > 0) {
                wsRef.current?.send(JSON.stringify({
                    type: 'is_read',
                    payload: {
                        conversationId: conversationId?.toString() || '',
                        senderId: user?.id.toString() || '',
                        messageIds: isReadyMessages,
                    }
                } as WebSocketMessage));
            }
        };

        wsRef.current.onmessage = (event) => {
            const messageData = JSON.parse(event.data);
            console.log('WebSocket message received:', messageData);
        };

        wsRef.current.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        wsRef.current.onclose = (event) => {
            wsRef.current?.send(JSON.stringify({
                type: 'offline',
                payload: {
                    conversationId: conversationId?.toString() || '',
                    senderId: user?.id.toString() || '',
                }
            } as WebSocketMessage));
            console.log('WebSocket connection closed:', event);
        };

        return () => {
            wsRef.current?.close();
            wsRef.current = null;
        };
    }, [conversationId]);

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

        setParticipant(participant); // Set default selected friend
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
        setMessageInput('');

        wsRef.current?.send(JSON.stringify({
            type: 'send_message',
            payload: {
                conversationId: conversationId?.toString() || '',
                senderId: user?.id.toString() || '',
                messageIds: [newMessage.id?.toString() || ''],
                token: Cookies.get('token') || ''
            }
        } as WebSocketMessage));
    };

    const handleTyping = () => {
        wsRef.current?.send(JSON.stringify({
            type: 'is_typing',
            payload: {
                conversationId: conversationId?.toString() || '',
                senderId: user?.id.toString() || '',
            }
        } as WebSocketMessage));
    };

    return (
        <div className="flex h-screen bg-gray-100">
            <div className="flex-1 flex flex-col">
                <>
                    {/* Chat Header */}
                    <div className="bg-white border-b border-gray-500 px-6 py-4">
                        <div className="flex items-center">
                            <div className="ml-5 relative">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                                    {(user?.name || "John").charAt(0).toUpperCase()}
                                </div>
                                {participant?.online
                                    ? (<div className="absolute bottom-0 -right-1 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>)
                                    : (<div className="absolute bottom-0 -right-1 w-3 h-3 bg-red-400 border-2 border-white rounded-full"></div>)
                                }
                            </div>
                            <div className="ml-3">
                                <h2 className="text-lg font-semibold text-gray-900">
                                    {user?.name}
                                </h2>
                                <p className="text-sm text-gray-500">
                                    {participant?.online ? 'online' : 'offline'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-100">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex flex-col ${message.senderId === BigInt(user?.id || -1) ? 'items-end' : 'items-start'}`}
                            >
                                {
                                    message.senderId !== BigInt(user?.id || -1) && (
                                        <p className='ml-5 text-gray-500 text-base'>{participant?.name}</p>
                                    )}
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
                    <FilePickerWidget messageInput={messageInput} setMessageInput={setMessageInput} handleTyping={handleTyping} handleMessageSend={handleMessageSend} />
                </>
            </div>
        </div>
    );
};

export default ChatWidget;