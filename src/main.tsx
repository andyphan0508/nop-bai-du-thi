import React from 'react';
import ReactDOM from 'react-dom/client';
import SubmitScreen from './screens/Submit';
import VoteScreen from './screens/Vote';
import VoteMobileScreen from './screens/VoteMobile';
import './styles/global.css';

const pathname = window.location.pathname.replace(/\/+$/, '');
const isVoteMobilePage = pathname === '/binh-chon/mobile';
const isVotePage = pathname === '/binh-chon';

const renderScreen = () => {
  if (isVoteMobilePage) return <VoteMobileScreen />;
  if (isVotePage) return <VoteScreen />;
  return <SubmitScreen />;
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{renderScreen()}</React.StrictMode>,
);
