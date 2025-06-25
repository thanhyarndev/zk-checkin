import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Tags from "./pages/Tags";
import Logs from "./pages/Logs";
import Config from "./pages/Config";

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/tags" element={<Tags />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/config" element={<Config />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
