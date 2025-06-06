import { useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import Cookies from 'js-cookie';

const LoginWidget = () => {
    const { userId, businessId } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        // mock login
        fetch(`${import.meta.env.VITE_API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: userId,
            }),
        }).then((response) => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            return response.json();
        }).then((data) => {
            Cookies.set('token', data.jwt, { expires: 7 });
            navigate(`/chat/${userId}/${businessId}`);
        });
    }, []);

    return (
        <div>Mock Login</div>
    )
};

export default LoginWidget;