import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './auth/LoginPage'
import RequireAuth from './auth/RequireAuth'
import AppLayout from './layout/AppLayout'
import { modules } from './modules/registry'

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected: everything with the sidebar */}
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        {modules.map(({ id, path, component: Page }) => (
          <Route key={id} path={path} element={<Page />} />
        ))}
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
