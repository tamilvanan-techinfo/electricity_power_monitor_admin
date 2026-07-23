import * as React from 'react';
import PropTypes from 'prop-types';
import { AppProvider } from '@toolpad/core/AppProvider';
import { DashboardLayout } from '@toolpad/core/DashboardLayout';
import { DemoProvider } from '@toolpad/core/internal';

import demoTheme from '../Theme';
import NAVIGATION from '../Navigation';
import CustomToolbarActions from '../components/Customtoolbaractions';
import DemoPageContent from '../components/PageDemoContent';
import SidebarFooterAccount from '../components/SidebarFooterAccount';
import { UserProvider } from '../contexts/UserContext';
import { useEffect } from 'react';
import LoginPage from '../Screens/LoginPage';
function DashboardLayoutAccountSidebar(props) {
  const { window } = props;
  const [pathname, setPathname] = React.useState('/dashboard');

  const router = React.useMemo(() => {
    return {
      pathname,
      searchParams: new URLSearchParams(),
      navigate: (path) => setPathname(String(path)),
    };
  }, [pathname]);

  // Remove this const when copying and pasting into your project.
  const demoWindow = window !== undefined ? window() : undefined;

//   const [session, setSession] = React.useState(demoSession);
//   const authentication = React.useMemo(() => {
//     return {
//       signIn: () => {
//         setSession(demoSession);
//       },
//       signOut: () => {
//         setSession(null);
//       },
//     };
//   }, []);
const token = localStorage.getItem('access')

  return (
    // Remove this provider when copying and pasting into your project.
    token ? (
        <UserProvider>
            <DemoProvider window={demoWindow}>
      <AppProvider
        navigation={NAVIGATION}
        router={router}
        theme={demoTheme}
        window={demoWindow}
        branding={{
            title:"Energy Monitoing Admin Panel",
            logo:null
  }}
        // authentication={authentication}
        // session={session}
      >
        {/* preview-start */}
        <UserProvider>
            <DashboardLayout
          slots={{
            toolbarActions: CustomToolbarActions,
            sidebarFooter: SidebarFooterAccount,
          }}
        >
          <DemoPageContent pathname={pathname} />
        </DashboardLayout>
        </UserProvider>
        {/* preview-end */}
      </AppProvider>
    </DemoProvider>
        </UserProvider>
    ) 
    :
    <LoginPage/>
  );
}

DashboardLayoutAccountSidebar.propTypes = {
  /**
   * Injected by the documentation to work in an iframe.
   * Remove this when copying and pasting into your project.
   */
  window: PropTypes.func,
};

export default DashboardLayoutAccountSidebar;