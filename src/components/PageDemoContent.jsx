import * as React from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Dashboard from '../Screens/Dashboard';
import ScreenManager from '../Screens/ScreenManager';
import ManualScoring from '../Screens/ManualScoring';
import FreeTextManager from '../Screens/FreeTextManager';
import AppSettings from '../Screens/AppSettings';

export default function DemoPageContent({ pathname }) {
  console.log('DemoPageContent received pathname:', pathname);

  if (pathname === '/' || pathname.includes('/dashboard')) {
    return <Dashboard />;
  }

  if (pathname.includes('/ScreenManager')) {
    return <ScreenManager />;
  }

  if (pathname.includes('/ManualScoring')) {
    return <ManualScoring />;
  }

  if (pathname.includes('/FreeTextManager')) {
    return <FreeTextManager />;
  }

  if (pathname.includes('/AppSettings')) {
    return <AppSettings />;
  }

  return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography variant="h5" gutterBottom>
        Page not found
      </Typography>
      <Typography variant="body1" color="text.secondary">
        The page you are looking for does not exist.
      </Typography>
    </Box>
  );
}

DemoPageContent.propTypes = {
  pathname: PropTypes.string.isRequired,
};