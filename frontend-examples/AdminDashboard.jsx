import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [otaStatus, setOtaStatus] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    fetchOtaStatus();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setDashboardData(response.data.data);
      }
    } catch (err) {
      setError('Error fetching dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOtaStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/ota/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setOtaStatus(response.data.data);
      }
    } catch (err) {
      console.error('OTA status error:', err);
    }
  };

  const syncAllOta = async () => {
    setSyncLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/ota/sync/all', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        alert('OTA sync completed successfully!');
        fetchOtaStatus(); // Refresh OTA status
      }
    } catch (err) {
      alert('Error syncing OTA platforms');
      console.error('OTA sync error:', err);
    } finally {
      setSyncLoading(false);
    }
  };

  const testOtaConnection = async (platform) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`/api/ota/test/${platform}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        alert(`${platform} connection successful!`);
      }
    } catch (err) {
      alert(`${platform} connection failed`);
      console.error('OTA test error:', err);
    }
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>
      
      {/* Overview Cards */}
      <div className="dashboard-overview">
        <div className="overview-card">
          <h3>Total Rooms</h3>
          <div className="stat-number">{dashboardData?.overview?.totalRooms || 0}</div>
          <div className="stat-subtitle">
            {dashboardData?.overview?.activeRooms || 0} active
          </div>
        </div>
        
        <div className="overview-card">
          <h3>Total Bookings</h3>
          <div className="stat-number">{dashboardData?.overview?.totalBookings || 0}</div>
          <div className="stat-subtitle">
            {dashboardData?.overview?.weeklyBookings || 0} this week
          </div>
        </div>
        
        <div className="overview-card">
          <h3>Monthly Revenue</h3>
          <div className="stat-number">
            {formatCurrency(dashboardData?.revenue?.monthly || 0)}
          </div>
          <div className="stat-subtitle">
            {dashboardData?.revenue?.monthlyBookings || 0} bookings
          </div>
        </div>
        
        <div className="overview-card">
          <h3>Occupancy Rate</h3>
          <div className="stat-number">
            {dashboardData?.overview?.occupancyRate || 0}%
          </div>
          <div className="stat-subtitle">This month</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="dashboard-charts">
        <div className="chart-container">
          <h3>Booking Status Distribution</h3>
          <div className="booking-stats">
            {dashboardData?.bookingStats?.map((stat, index) => (
              <div key={index} className="stat-item">
                <span className="stat-label">{stat._id}</span>
                <span className="stat-count">{stat.count}</span>
                <span className="stat-revenue">{formatCurrency(stat.revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="recent-bookings">
        <h3>Recent Bookings</h3>
        <div className="bookings-table">
          <table>
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Guest</th>
                <th>Room</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {dashboardData?.recentBookings?.map((booking) => (
                <tr key={booking.id}>
                  <td>{booking.bookingId}</td>
                  <td>{booking.guest.name}</td>
                  <td>{booking.room.name} ({booking.room.roomNumber})</td>
                  <td>
                    <span className={`status-badge ${booking.status}`}>
                      {booking.status}
                    </span>
                  </td>
                  <td>{formatDate(booking.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* OTA Integration Panel */}
      <div className="ota-panel">
        <h3>OTA Integration</h3>
        <div className="ota-controls">
          <button 
            onClick={syncAllOta}
            disabled={syncLoading}
            className="sync-all-btn"
          >
            {syncLoading ? 'Syncing...' : 'Sync All OTA Platforms'}
          </button>
        </div>
        
        {otaStatus && (
          <div className="ota-status">
            <div className="ota-platform">
              <h4>Booking.com</h4>
              <div className="platform-info">
                <span className={`status ${otaStatus.platforms.bookingCom.enabled ? 'enabled' : 'disabled'}`}>
                  {otaStatus.platforms.bookingCom.enabled ? 'Enabled' : 'Disabled'}
                </span>
                <span>Rooms: {otaStatus.platforms.bookingCom.roomCount}</span>
                <span>
                  Last Sync: {otaStatus.platforms.bookingCom.lastSync 
                    ? formatDate(otaStatus.platforms.bookingCom.lastSync)
                    : 'Never'
                  }
                </span>
              </div>
              <div className="platform-stats">
                <span>Bookings: {otaStatus.otaBookings.booking_com?.count || 0}</span>
                <span>Revenue: {formatCurrency(otaStatus.otaBookings.booking_com?.revenue || 0)}</span>
              </div>
              <button 
                onClick={() => testOtaConnection('booking_com')}
                className="test-connection-btn"
              >
                Test Connection
              </button>
            </div>
            
            <div className="ota-platform">
              <h4>Agoda</h4>
              <div className="platform-info">
                <span className={`status ${otaStatus.platforms.agoda.enabled ? 'enabled' : 'disabled'}`}>
                  {otaStatus.platforms.agoda.enabled ? 'Enabled' : 'Disabled'}
                </span>
                <span>Rooms: {otaStatus.platforms.agoda.roomCount}</span>
                <span>
                  Last Sync: {otaStatus.platforms.agoda.lastSync 
                    ? formatDate(otaStatus.platforms.agoda.lastSync)
                    : 'Never'
                  }
                </span>
              </div>
              <div className="platform-stats">
                <span>Bookings: {otaStatus.otaBookings.agoda?.count || 0}</span>
                <span>Revenue: {formatCurrency(otaStatus.otaBookings.agoda?.revenue || 0)}</span>
              </div>
              <button 
                onClick={() => testOtaConnection('agoda')}
                className="test-connection-btn"
              >
                Test Connection
              </button>
            </div>
            
            <div className="ota-platform">
              <h4>Airbnb</h4>
              <div className="platform-info">
                <span className={`status ${otaStatus.platforms.airbnb.enabled ? 'enabled' : 'disabled'}`}>
                  {otaStatus.platforms.airbnb.enabled ? 'Enabled' : 'Disabled'}
                </span>
                <span>Rooms: {otaStatus.platforms.airbnb.roomCount}</span>
                <span>
                  Last Sync: {otaStatus.platforms.airbnb.lastSync 
                    ? formatDate(otaStatus.platforms.airbnb.lastSync)
                    : 'Never'
                  }
                </span>
              </div>
              <div className="platform-stats">
                <span>Bookings: {otaStatus.otaBookings.airbnb?.count || 0}</span>
                <span>Revenue: {formatCurrency(otaStatus.otaBookings.airbnb?.revenue || 0)}</span>
              </div>
              <button 
                onClick={() => testOtaConnection('airbnb')}
                className="test-connection-btn"
              >
                Test Connection
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="action-buttons">
          <button 
            onClick={() => window.location.href = '/admin/rooms'}
            className="action-btn"
          >
            Manage Rooms
          </button>
          <button 
            onClick={() => window.location.href = '/admin/bookings'}
            className="action-btn"
          >
            View Bookings
          </button>
          <button 
            onClick={() => window.location.href = '/admin/users'}
            className="action-btn"
          >
            Manage Users
          </button>
          <button 
            onClick={() => window.location.href = '/admin/reports'}
            className="action-btn"
          >
            View Reports
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;