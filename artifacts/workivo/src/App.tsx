import { useEffect } from 'react';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import Landing from '@/pages/Landing';
import NotFound from '@/pages/not-found';

function App() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Switch>
        <Route path="/" component={Landing} />
        <Route component={NotFound} />
      </Switch>
    </WouterRouter>
  );
}

export default App;
