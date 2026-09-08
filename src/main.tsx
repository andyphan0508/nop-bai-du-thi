import React from 'react';
import ReactDOM from 'react-dom/client';
import SubmitScreen from './screens/Submit';
import VoteScreen from './screens/Vote';
import './styles/global.css';

const isVotePage = window.location.pathname.replace(/\/+$/, '') === '/binh-chon';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isVotePage ? <VoteScreen /> : <SubmitScreen />}
  </React.StrictMode>,
);
