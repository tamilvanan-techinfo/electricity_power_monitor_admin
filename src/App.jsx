import * as React from 'react';
import DashboardLayoutAccountSidebar from './components/Dashboardlayoutaccountsidebar';
import { SocketProvider } from "./contexts/SocketContext";
 
// export default function App() {
//   return ;
// }

export default function App() {
  return (
    <SocketProvider>
      <DashboardLayoutAccountSidebar />
    </SocketProvider>
  );
}