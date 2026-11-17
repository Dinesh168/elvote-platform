import React, { useState } from 'react';
import { getAuth, onAuthStateChanged, onIdTokenChanged, User } from 'firebase/auth';
import AppDataService from '../../services/AppDataService';

const auth = getAuth();

export function useAuthentication() {
  const [userVal, setUserVal] = useState();
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    const interval = setInterval(() => {
      if (auth?.currentUser) {
        auth.currentUser.getIdToken().then(idToken => {
            AppDataService.setCommonHeader('token', idToken);
        }).catch(e => {})
      }
    }, 60000)

    return () => clearInterval(interval);
  }, [auth.currentUser])

  React.useEffect(() => {
    const unsubscribeFromAuthStatuChanged = onAuthStateChanged(auth, (user) => {
      if (user) {
        user
          .getIdToken()
          .then(idToken => {
            AppDataService.setCommonHeader('token', idToken);
            setUserVal(user);
          })
          .catch(e => {
            setUserVal(undefined);
          })
      } else {
        AppDataService.setCommonHeader('token', '');
        setUserVal(undefined);
      }
      setIsLoading(false);
    });

    return unsubscribeFromAuthStatuChanged;
  }, []);

  return {
    user: userVal,
    isLoading
  };
}
