import * as React from 'react';
import Stack from '@mui/material/Stack';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate } from 'react-router-dom';
import { Button, Typography } from '@mui/material';

export default function CustomToolbarActions() {
  const navigate = useNavigate();

  const handleLogout = () => {
        console.log('Logout button clicked');

      localStorage.removeItem('access');
      localStorage.removeItem('refresh');
      localStorage.removeItem('user_id');
      localStorage.removeItem('username');
      localStorage.removeItem('email');
      window.location.reload()

  };

  return (
    <Stack direction="row" alignItems="center">
      {/* <ThemeSwitcher /> */}
    </Stack>
  );
}