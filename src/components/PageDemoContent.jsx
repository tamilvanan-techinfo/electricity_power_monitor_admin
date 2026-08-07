import * as React from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Dashboard from '../Screens/Dashboard';
import ScreenManager from '../Screens/ScreenManager';
import ManualScoring from '../Screens/ManualScoring';
import FreeTextManager from '../Screens/FreeTextManager';
export default function DemoPageContent({ pathname }) {


  switch (pathname) {
    case '/':
      return <Dashboard/>
      break;

    case '/dashboard':
      return <Dashboard/>
      break;

    case '/ScreenManager':
      return <ScreenManager/>
    case '/ManualScoring':
      return <ManualScoring/>
    case '/FreeTextManager':
      return <FreeTextManager/>

    default:
      title = 'Page not found';
      description = 'The page you are looking for does not exist.';
      break;
  }

 
}

DemoPageContent.propTypes = {
  pathname: PropTypes.string.isRequired,
};