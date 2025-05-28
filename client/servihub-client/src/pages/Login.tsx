import React, { useState } from 'react';
import { Lock, Eye, EyeOff, User, Users, ChevronDown } from 'lucide-react';

interface LoginForm {
    username: string;
    password: string;
    role: 'customer' | 'agent';
}

const LoginPage: React.FC = () => {
    const [formData, setFormData] = useState<LoginForm>({
        username: '',
        password: '',
        role: 'customer'
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleRoleChange = (role: 'customer' | 'agent') => {
        setFormData(prev => ({
            ...prev,
            role
        }));
        setIsRoleDropdownOpen(false);
    };

    const getRoleIcon = (role: 'customer' | 'agent') => {
        return role === 'customer' ? User : Users;
    };

    const getRoleLabel = (role: 'customer' | 'agent') => {
        return role === 'customer' ? 'Customer' : 'Agent';
    };

    const handleSubmit = async () => {
        setIsLoading(true);

        // Simulate login process
        setTimeout(() => {
            console.log('Login submitted:', formData);
            setIsLoading(false);
            // Handle successful login here
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                            <User className="w-8 h-8 text-blue-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h1>
                        <p className="text-gray-600">Login to your account</p>
                    </div>

                    {/* Login Form */}
                    <div className="space-y-6">
                        {/* Role Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Role
                            </label>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                                    className="w-full flex items-center justify-between p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                                >
                                    <div className="flex items-center">
                                        {React.createElement(getRoleIcon(formData.role), { className: "w-5 h-5 text-gray-600 mr-2" })}
                                        <span className="text-gray-900">{getRoleLabel(formData.role)}</span>
                                    </div>
                                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isRoleDropdownOpen ? 'rotate-180' : ''
                                        }`} />
                                </button>

                                {isRoleDropdownOpen && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                                        <button
                                            type="button"
                                            onClick={() => handleRoleChange('customer')}
                                            className={`w-full flex items-center p-3 hover:bg-gray-50 transition-colors duration-200 ${formData.role === 'customer' ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                                                }`}
                                        >
                                            <User className="w-5 h-5 mr-2" />
                                            Customer
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleRoleChange('agent')}
                                            className={`w-full flex items-center p-3 hover:bg-gray-50 transition-colors duration-200 rounded-b-lg ${formData.role === 'agent' ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                                                }`}
                                        >
                                            <Users className="w-5 h-5 mr-2" />
                                            Agent
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Username Field */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Username
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    {React.createElement(getRoleIcon(formData.role), { className: "w-5 h-5 text-gray-400" })}
                                </div>
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    required
                                    value={formData.username}
                                    onChange={handleInputChange}
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                                    placeholder="Enter your username"
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                                    placeholder="Enter your password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                    ) : (
                                        <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            onClick={handleSubmit}
                            disabled={isLoading}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                        >
                            {isLoading ? (
                                <div className="flex items-center">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Signing in...
                                </div>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </div>

                    {/* Footer */}
                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600">
                            Don't have an account?{' '}
                            <button className="font-medium text-blue-600 hover:text-blue-500">
                                Sign up
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;