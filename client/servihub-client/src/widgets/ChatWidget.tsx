import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Check, CheckCheck } from 'lucide-react';
import FilePickerWidget from './FilePickeWidget';
import Cookies from 'js-cookie';

type ParticipantStatus = 'online' | 'offline' | 'typing';

interface Participant {
    id: number;
    name: string;
    lastMessage?: string;
    time?: string;
    unread?: number;
    status: ParticipantStatus;
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
        name?: string;
        conversationId?: string;
        senderId?: string;
        messageIds?: string[];
        token?: string;
    };
}

const ChatWidget = () => {
    const { userId, businessId } = useParams<{ userId: string; businessId: string }>();
    const [participant, setParticipant] = useState<Participant | null>(null);
    const [agentName, setAgentName] = useState<string>('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [messageInput, setMessageInput] = useState('');
    const [user, setUser] = useState<{ id: number; name: string } | null>(null);
    const [conversationId, setConversationId] = useState<BigInt | null>(null);
    const [attachment, setAttachment] = useState<attachment[]>([]);
    const roleRef = useRef<'CUSTOMER' | 'AGENT' | null>(null);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        // fetch initial conversation and user data
        fetch(`${import.meta.env.VITE_API_URL}/conversations/${userId}/${businessId}`, {
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
            fetch(`${import.meta.env.VITE_API_URL}/user/${userId}`)
                .then((response) => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                }).then((data) => {
                    setUser({
                        id: userId ? Number(userId) : 0,
                        name: data.name
                    });
                }).catch((error) => {
                    console.error('Error fetching user data:', error);
                });

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

            let myRole: 'CUSTOMER' | 'AGENT' | null = null;
            let customerId: number | null = null;

            // check if the current user is customer or agent
            for (const participant of data.conversations[0].participants) {
                if (participant.userId === userId) {
                    myRole = participant.role;
                    roleRef.current = myRole;
                }

                if (participant.role === 'CUSTOMER') {
                    customerId = participant.userId;
                }
            }

            // if my role is customer, fetch business data
            if (myRole === 'CUSTOMER') {
                fetch(`${import.meta.env.VITE_API_URL}/business/${businessId}`)
                    .then((response) => {
                        if (!response.ok) {
                            throw new Error('Network response was not ok');
                        }
                        return response.json();
                    }).then((data) => {
                        setParticipant({
                            id: data.id,
                            name: data.name,
                            status: "offline" as ParticipantStatus,
                        });
                    }).catch((error) => {
                        console.error('Error fetching business data:', error);
                    });
            } else {
                fetch(`${import.meta.env.VITE_API_URL}/user/${customerId}`)
                    .then((response) => {
                        if (!response.ok) {
                            throw new Error('Network response was not ok');
                        }
                        return response.json();
                    }).then((data) => {
                        setParticipant({
                            id: data.id,
                            name: data.name,
                            status: "offline" as ParticipantStatus,
                        });
                    }).catch((error) => {
                        console.error('Error fetching user data:', error);
                    });
            }

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

        // when the WebSocket connection is opened, send the online message
        // let the participant know that the user is online
        // and update the participant's name and status
        wsRef.current.onopen = async () => {
            await fetch(`${import.meta.env.VITE_API_URL}/user/${userId}`)
                .then((response) => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                }).then((data) => {
                    console.log('WebSocket connection opened:', data);
                    wsRef.current?.send(JSON.stringify({
                        type: 'online',
                        payload: {
                            name: data.name || '',
                            conversationId: conversationId?.toString() || '',
                            senderId: user?.id.toString() || '',
                        }
                    } as WebSocketMessage));
                }).catch((error) => {
                    console.error('Error fetching user data:', error);
                });
        };

        wsRef.current.onmessage = (event) => {
            const messageData = JSON.parse(event.data) as WebSocketMessage;

            console.log('WebSocket message received:', messageData);

            switch (messageData.type) {
                // when receiving an online message, update the participant's name and status
                // if the role is customer, update the agent name, to ensure which agent is online
                case 'online':
                    setAgentName(messageData.payload.name || '');
                    setParticipant((prev) => {
                        if (prev) {
                            if (roleRef.current === 'CUSTOMER') {
                                return {
                                    ...prev,
                                    id: messageData.payload.senderId ? Number(messageData.payload.senderId) : prev.id,
                                    status: 'online' as ParticipantStatus
                                };
                            } else {
                                return { ...prev, status: 'online' as ParticipantStatus };
                            }
                        }
                        return prev;
                    });

                    break;

                case 'offline':
                    if (messageData.payload.senderId === participant?.id.toString()) {
                        setParticipant((prev) => {
                            if (prev) {
                                return { ...prev, status: 'offline' as ParticipantStatus };
                            }
                            return prev;
                        })
                    }

                    break;

                case 'is_typing':
                    if (messageData.payload.senderId === participant?.id.toString()) {
                        setParticipant((prev) => {
                            if (prev) {
                                return { ...prev, status: 'typing' as ParticipantStatus };
                            }
                            return prev;
                        });
                    }

                    break;

                // after the participant send the message, update the messages
                case 'send_message':
                    if (messageData.payload.senderId === participant?.id.toString()) {
                        setParticipant((prev) => {
                            if (prev) {
                                return { ...prev, status: 'online' as ParticipantStatus };
                            }
                            return prev;
                        })

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
                    }
                    break;
            }
        };


        wsRef.current.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        wsRef.current.onclose = (event) => {
            wsRef.current = null;
            console.log('WebSocket connection closed:', event);
        };

        return () => {
            if (wsRef.current) {
                if (wsRef.current.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({
                        type: 'offline',
                        payload: {
                            conversationId: conversationId?.toString() || '',
                            senderId: user?.id.toString() || '',
                        }
                    } as WebSocketMessage));
                }
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [userId, conversationId]);

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

    const handleMessageSend = async () => {
        if (messageInput.trim() === '') return;

        const newMessage: Message = {
            conversationId: BigInt(1),
            senderId: BigInt(1),
            body: messageInput,
            contentType: "TEXT",
            attachments: attachment,
            createdAt: new Date(),
        };
        setMessageInput('');

        wsRef.current?.send(JSON.stringify({
            type: 'send_message',
            payload: {
                conversationId: conversationId?.
                    toString() || '',
                senderId: user?.id.toString() || '',
                messageIds: [newMessage.id?.toString() || ''],
                token: Cookies.get('token') || ''
            }
        } as WebSocketMessage));

        // Send the message to the server through the API
        await fetch(`${import.meta.env.VITE_API_URL}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Cookies.get('token')}`

            },
            body: JSON.stringify(newMessage, (_, value) => {
                if (value instanceof Date) {
                    return value.toISOString();
                }
                if (typeof value === 'bigint') {
                    return value.toString(); // Convert BigInt to string for JSON serialization
                }
                return value;
            })
        });

        // Fetch the updated messages after sending
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

    const statusToText = (status: ParticipantStatus) => {
        switch (status) {
            case 'online':
                return 'Online';
            case 'offline':
                return 'Offline';
            case 'typing':
                return 'Typing...';
        }
    }

    return (
        <div className="flex h-screen bg-gray-100">
            <div className="flex-1 flex flex-col">
                <>
                    {/* Chat Header */}
                    <div className="bg-white border-b border-gray-500 px-6 py-4">
                        <div className="flex items-center">
                            <div className="ml-5 relative">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                                    {(participant?.name || "").charAt(0).toUpperCase()}
                                </div>
                                {participant?.status === "online"
                                    ? (<div className="absolute bottom-0 -right-1 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>)
                                    : (<div className="absolute bottom-0 -right-1 w-3 h-3 bg-red-400 border-2 border-white rounded-full"></div>)
                                }
                            </div>
                            <div className="ml-3">
                                <h2 className="text-lg font-semibold text-gray-900">
                                    {participant?.name}
                                </h2>
                                <p className="text-sm text-gray-500">
                                    {statusToText(participant?.status || 'offline')}
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
                                        <p className='ml-5 text-gray-500 text-base'>
                                            {roleRef.current == "CUSTOMER" ? `${participant?.name} - ${agentName} (Agent)` : participant?.name}
                                        </p>
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
                    <FilePickerWidget onFilesSelected={setAttachment} messageInput={messageInput} setMessageInput={setMessageInput} handleTyping={handleTyping} handleMessageSend={handleMessageSend} />
                </>
            </div>
        </div>
    );
};

export default ChatWidget;