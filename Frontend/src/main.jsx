import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx'; 
import { AuthProvider } from "react-oidc-context";

const cognitoAuthConfig = {
  authority: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_v8BBaLDSN",
  client_id: "etvj75eakdlr5n4soh2qm6h53",
  redirect_uri: "https://d9fy86td1wwlq.cloudfront.net/", 
  response_type: "code",
  scope: "email openid phone",
  
  // NEW: This wipes the "?code=..." tracking parameters from the URL bar 
  // the exact millisecond after you successfully log in.
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider {...cognitoAuthConfig}>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);