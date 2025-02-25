import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import './App.css';

function App() {
  const [symbol, setSymbol] = useState('');
  const [price, setPrice] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [chartData, setChartData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [watchlist, setWatchlist] = useState([]);

  useEffect(() => {
    fetchFavorites();
    fetchWatchlist(['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'META', 'TSLA', 'GS', 'DJIA', 'SPX', 'COMP']);
  }, []);

  const fetchCurrentPrice = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://127.0.0.1:5000/current_price', { params: { symbol } });
      setPrice(response.data.price);
      setError(null);
    } catch (err) {
      setError(err.response ? err.response.data.error : err.message);
    }
    setLoading(false);
  };

  const fetchHistoricalData = async (symbolToFetch) => {
    const fetchSymbol = symbolToFetch || symbol;
    const currentEndDate = endDate || new Date().toISOString().split('T')[0];
    const currentStartDate = startDate || new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString().split('T')[0];

    setLoading(true);
    try {
      const response = await axios.get('http://127.0.0.1:5000/historical_data', {
        params: { symbol: fetchSymbol, start_date: currentStartDate, end_date: currentEndDate }
      });
      const data = response.data.data;

      const labels = data.map(entry => new Date(entry.date).toLocaleDateString());
      const closePrices = data.map(entry => entry.close);

      setChartData({
        labels: labels,
        datasets: [
          {
            label: 'Closing Price',
            data: closePrices,
            borderColor: 'rgba(75,192,192,1)',
            backgroundColor: 'rgba(75,192,192,0.2)',
            fill: true
          }
        ]
      });
      setError(null);
    } catch (err) {
      setError(err.response ? err.response.data.error : err.message);
    }
    setLoading(false);
  };

  const addFavorite = async () => {
    setLoading(true);
    try {
      const response = await axios.post('http://127.0.0.1:5000/favorites', { symbol });
      setFavorites(response.data.favorites);
      setError(null);
    } catch (err) {
      setError(err.response ? err.response.data.error : err.message);
    }
    setLoading(false);
  };

  const fetchFavorites = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:5000/favorites');
      setFavorites(response.data.favorites);
    } catch (err) {
      setError(err.response ? err.response.data.error : err.message);
    }
  };

  const fetchWatchlist = async (symbols) => {
    try {
      const response = await axios.get('http://127.0.0.1:5000/watchlist', { params: { symbols } });
      setWatchlist(response.data.watchlist);
    } catch (err) {
      setError(err.response ? err.response.data.error : err.message);
    }
  };

  return (
    <div className="App">
      <div className="left-column">
        <h1>Stock Price Lookup</h1>
        <div>
          <input
            type="text"
            placeholder="Company Symbol"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
          />
          <button onClick={fetchCurrentPrice} disabled={loading}>Show Current Price</button>
          <button onClick={addFavorite} disabled={loading}>Add to Favorites</button>
        </div>
        {loading && <div>Loading...</div>}
        {price && <div>Current Price: ${price.toFixed(2)}</div>}
        {error && <div style={{ color: 'red' }}>Error: {error}</div>}

        <div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <button onClick={() => fetchHistoricalData(symbol)} disabled={loading}>Plot Data</button>
        </div>
        {chartData && <Line data={chartData} />}
      </div>

      <div className="right-column">
        <h2>Favorite Stocks</h2>
        <ul>
          {favorites.map(fav => (
            <li key={fav.symbol}>
              {fav.symbol}: {fav.price !== undefined ? `$${fav.price.toFixed(2)}` : 'Price not available'}
              <button onClick={() => fetchHistoricalData(fav.symbol)}>Show Last 6 Months Chart</button>
            </li>
          ))}
        </ul>

        <h2>Watchlist</h2>
        <ul>
          {watchlist.map(stock => (
            <li key={stock.symbol}>
              {stock.symbol}: {stock.price !== undefined ? `$${stock.price.toFixed(2)}` : 'Price not available'} | {stock.profit.toFixed(2)}% 1-Year Profit
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;