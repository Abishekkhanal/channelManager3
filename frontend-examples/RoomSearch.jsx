import React, { useState, useEffect } from 'react';
import axios from 'axios';

const RoomSearch = () => {
  const [searchParams, setSearchParams] = useState({
    checkIn: '',
    checkOut: '',
    adults: 1,
    children: 0,
    category: '',
    type: '',
    minPrice: '',
    maxPrice: ''
  });
  
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSearchParams(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const searchRooms = async (page = 1) => {
    setLoading(true);
    setError('');
    
    try {
      const queryParams = new URLSearchParams({
        ...searchParams,
        maxOccupancy: searchParams.adults + searchParams.children,
        page,
        limit: 10
      });

      const response = await axios.get(`/api/rooms?${queryParams}`);
      
      if (response.data.success) {
        setRooms(response.data.data);
        setPagination(response.data.pagination);
      }
    } catch (err) {
      setError('Error searching rooms. Please try again.');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    searchRooms();
  };

  const checkAvailability = async (roomId) => {
    if (!searchParams.checkIn || !searchParams.checkOut) {
      alert('Please select check-in and check-out dates');
      return;
    }

    try {
      const response = await axios.post(`/api/rooms/${roomId}/availability`, {
        checkIn: searchParams.checkIn,
        checkOut: searchParams.checkOut
      });

      if (response.data.success) {
        if (response.data.available) {
          alert(`Room is available! Total price: ${response.data.pricing.currency} ${response.data.pricing.totalPrice}`);
        } else {
          alert('Room is not available for selected dates');
        }
      }
    } catch (err) {
      alert('Error checking availability');
      console.error('Availability error:', err);
    }
  };

  const formatPrice = (price, currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(price);
  };

  return (
    <div className="room-search-container">
      <h2>Search Rooms</h2>
      
      {/* Search Form */}
      <form onSubmit={handleSubmit} className="search-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="checkIn">Check-in Date</label>
            <input
              type="date"
              id="checkIn"
              name="checkIn"
              value={searchParams.checkIn}
              onChange={handleInputChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="checkOut">Check-out Date</label>
            <input
              type="date"
              id="checkOut"
              name="checkOut"
              value={searchParams.checkOut}
              onChange={handleInputChange}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="adults">Adults</label>
            <select
              id="adults"
              name="adults"
              value={searchParams.adults}
              onChange={handleInputChange}
            >
              {[1, 2, 3, 4, 5, 6].map(num => (
                <option key={num} value={num}>{num}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="children">Children</label>
            <select
              id="children"
              name="children"
              value={searchParams.children}
              onChange={handleInputChange}
            >
              {[0, 1, 2, 3, 4].map(num => (
                <option key={num} value={num}>{num}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="category">Room Category</label>
            <select
              id="category"
              name="category"
              value={searchParams.category}
              onChange={handleInputChange}
            >
              <option value="">All Categories</option>
              <option value="Single">Single</option>
              <option value="Double">Double</option>
              <option value="Deluxe">Deluxe</option>
              <option value="Suite">Suite</option>
              <option value="Presidential">Presidential</option>
              <option value="Family">Family</option>
              <option value="Twin">Twin</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="type">Room Type</label>
            <select
              id="type"
              name="type"
              value={searchParams.type}
              onChange={handleInputChange}
            >
              <option value="">All Types</option>
              <option value="Standard">Standard</option>
              <option value="Superior">Superior</option>
              <option value="Deluxe">Deluxe</option>
              <option value="Executive">Executive</option>
              <option value="Premium">Premium</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="minPrice">Min Price</label>
            <input
              type="number"
              id="minPrice"
              name="minPrice"
              value={searchParams.minPrice}
              onChange={handleInputChange}
              placeholder="0"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="maxPrice">Max Price</label>
            <input
              type="number"
              id="maxPrice"
              name="maxPrice"
              value={searchParams.maxPrice}
              onChange={handleInputChange}
              placeholder="1000"
            />
          </div>
        </div>

        <button type="submit" className="search-button" disabled={loading}>
          {loading ? 'Searching...' : 'Search Rooms'}
        </button>
      </form>

      {/* Error Message */}
      {error && <div className="error-message">{error}</div>}

      {/* Results */}
      <div className="search-results">
        {rooms.length > 0 && (
          <>
            <h3>Available Rooms ({pagination.total} found)</h3>
            <div className="rooms-grid">
              {rooms.map(room => (
                <div key={room.id} className="room-card">
                  <div className="room-image">
                    {room.primaryImage ? (
                      <img 
                        src={room.primaryImage.url} 
                        alt={room.primaryImage.caption || room.name}
                      />
                    ) : (
                      <div className="no-image">No Image</div>
                    )}
                  </div>
                  
                  <div className="room-details">
                    <h4>{room.name}</h4>
                    <p className="room-number">Room {room.roomNumber}</p>
                    <p className="room-category">{room.category} - {room.type}</p>
                    <p className="room-description">{room.description}</p>
                    
                    <div className="room-capacity">
                      <span>Max Occupancy: {room.capacity.maxOccupancy}</span>
                      <span>Adults: {room.capacity.adults}</span>
                      <span>Children: {room.capacity.children}</span>
                    </div>
                    
                    <div className="room-amenities">
                      <h5>Amenities:</h5>
                      <ul>
                        {room.amenities.slice(0, 5).map((amenity, index) => (
                          <li key={index}>{amenity.name}</li>
                        ))}
                        {room.amenities.length > 5 && (
                          <li>+{room.amenities.length - 5} more</li>
                        )}
                      </ul>
                    </div>
                    
                    <div className="room-pricing">
                      <span className="price">
                        {formatPrice(room.price.basePrice, room.price.currency)} / night
                      </span>
                    </div>
                    
                    <div className="room-actions">
                      <button 
                        onClick={() => checkAvailability(room.id)}
                        className="check-availability-btn"
                      >
                        Check Availability
                      </button>
                      <button 
                        onClick={() => window.location.href = `/rooms/${room.id}`}
                        className="view-details-btn"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="pagination">
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => searchRooms(page)}
                    className={`page-btn ${page === pagination.page ? 'active' : ''}`}
                  >
                    {page}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        
        {!loading && rooms.length === 0 && searchParams.checkIn && (
          <div className="no-results">
            <h3>No rooms found</h3>
            <p>Try adjusting your search criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomSearch;