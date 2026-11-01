import { lazy, Suspense } from 'react';
import { Routes } from './router.jsx';
import { IconSprite } from './components/Icon.jsx';
import { ToastProvider } from './components/Toasts.jsx';
import { GridProvider } from './components/Layout.jsx';
const Landing = lazy(() => import('./pages/Landing.jsx'));
import Home from './pages/Home.jsx';
import Post from './pages/Post.jsx';
import Write from './pages/Write.jsx';
import Auth from './pages/Auth.jsx';
import Akun from './pages/Akun.jsx';
import Tersimpan from './pages/Tersimpan.jsx';
import Tag from './pages/Tag.jsx';
import Tentang from './pages/Tentang.jsx';
import NotFound from './pages/NotFound.jsx';

const routes = [
  {
    path: '/',
    element: (
      <Suspense fallback={null}>
        <Landing />
      </Suspense>
    )
  },
  { path: '/baca', element: <Home /> },
  { path: '/tulisan/:slug', element: <Post /> },
  { path: '/tulis', element: <Write /> },
  { path: '/masuk', element: <Auth mode="login" /> },
  { path: '/daftar', element: <Auth mode="signup" /> },
  { path: '/akun', element: <Akun /> },
  { path: '/tag', element: <Tag /> },
  { path: '/tersimpan', element: <Tersimpan /> },
  { path: '/tentang', element: <Tentang /> },
  { path: '*', element: <NotFound /> }
];

export default function App() {
  return (
    <ToastProvider>
      <GridProvider>
        <IconSprite />
        <Routes routes={routes} />
      </GridProvider>
    </ToastProvider>
  );
}
