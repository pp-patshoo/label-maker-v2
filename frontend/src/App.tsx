import { Navigate, Route, Routes } from 'react-router-dom'
import ChangePasswordPage from './auth/ChangePasswordPage'
import LoginPage from './auth/LoginPage'
import RequireAuth from './auth/RequireAuth'
import AppLayout from './layout/AppLayout'
import { modules } from './modules/registry'

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Signed in with a temporary password */}
      <Route
        path="/change-password"
        element={
          <RequireAuth allowPasswordChange>
            <ChangePasswordPage />
          </RequireAuth>
        }
      />

      {/* Protected: everything with the sidebar */}
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        {modules.map(({ id, path, component: Page, requiredRole }) => (
          <Route
            key={id}
            path={path}
            element={
              requiredRole ? (
                <RequireAuth requiredRole={requiredRole}>
                  <Page />
                </RequireAuth>
              ) : (
                <Page />
              )
            }
          />
        ))}
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
