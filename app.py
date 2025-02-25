from flask import Flask, request, jsonify
from flask_cors import CORS
from yahoo_fin import stock_info
from datetime import datetime, timedelta
import pandas as pd

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # Configure specific origins as needed

# In-memory store for favorite stocks (for simplicity, use a database in production)
favorite_stocks = []
# List of symbols for the watchlist
watchlist_symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'META', 'TSLA', 'GS', 'DJIA', 'SPX', 'COMP']


@app.route('/current_price', methods=['GET'])
def current_price():
    try:
        symbol = request.args.get('symbol')
        if not symbol:
            return jsonify({"error": "Symbol parameter is required"}), 400
        
        price = stock_info.get_live_price(symbol)
        return jsonify({"price": price})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/historical_data', methods=['GET'])
def historical_data():
    try:
        symbol = request.args.get('symbol')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        if not symbol:
            return jsonify({"error": "Symbol parameter is required"}), 400

        if not start_date or not end_date:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=180)  # 6 months
        else:
            try:
                start_date = datetime.strptime(start_date, "%Y-%m-%d")
                end_date = datetime.strptime(end_date, "%Y-%m-%d")
            except ValueError:
                return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
        
        data = stock_info.get_data(symbol, start_date=start_date, end_date=end_date)
        data = data[['close']].reset_index().to_dict(orient='records')

        
        return jsonify({"data": data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/favorites', methods=['POST'])
def add_favorite():
    try:
        symbol = request.json.get('symbol')
        if not symbol:
            return jsonify({"error": "Symbol parameter is required"}), 400
        
        if symbol not in favorite_stocks:
            favorite_stocks.append(symbol)
        return jsonify({"favorites": favorite_stocks}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/favorites', methods=['GET'])
def get_favorites():
    try:
        favorites_data = []
        for symbol in favorite_stocks:
            price = stock_info.get_live_price(symbol)
            favorites_data.append({"symbol": symbol, "price": price})
        return jsonify({"favorites": favorites_data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/watchlist', methods=['GET'])
def get_watchlist():
    try:
        watchlist_data = []
        for symbol in watchlist_symbols:
            try:
                # Get current price
                price = stock_info.get_live_price(symbol)

                # Get historical data for 2 years
                end_date = datetime.now()
                start_date = end_date - timedelta(days=365)
                data = stock_info.get_data(symbol, start_date=start_date, end_date=end_date)

                # Ensure there is enough data for calculation
                if len(data) >= 60:  # At least 2 years of trading days
                    start_price = data['close'].iloc[0]
                    end_price = data['close'].iloc[-1]
                    profit_percentage = ((end_price - start_price) / start_price) * 100
                    formatted_profit = round(profit_percentage, 2)
                else:
                    formatted_profit = 0  # Default to 0 if insufficient data

                watchlist_data.append({"symbol": symbol, "price": price, "profit": formatted_profit})
            except Exception as e:
                print(f"Error fetching data for {symbol}: {str(e)}")
        
        return jsonify({"watchlist": watchlist_data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

if __name__ == '__main__':
    app.run(debug=True)
