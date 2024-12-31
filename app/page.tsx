"use client";
import axios from 'axios';
import React, { useEffect, useState } from 'react';

interface Seat {
  seat_id: number;
  booked: boolean;
  user_id: null | number;
  status: 'available' | 'booked';
}

interface SeatFromAPI {
  seat_id: number;
  booked: boolean;
  user_id: null | number;
}

const Home: React.FC = () => {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [numSeats, setNumSeats] = useState<number | "">("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSeats();
  }, []);
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const fetchSeats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/bookings/view`);
      const formattedSeats: Seat[] = response.data.map((seat: SeatFromAPI) => ({
        ...seat,
        status: seat.booked ? 'booked' : 'available', // Dynamically add status based on booked field
      }));
      setSeats(formattedSeats);
      return formattedSeats;
    } catch (error) {
      console.error('Error fetching seats:', error);
      return [];
    }
  };

  const bookSeats = async () => {
    if (!numSeats || numSeats <= 0) return alert('Please enter a valid number of seats to book');

    setLoading(true);
    try {
      const updatedSeats: Seat[] = await fetchSeats();
      const totalSeats = updatedSeats.length;
      const seatsPerRow = 7;

      if (updatedSeats.filter(seat => !seat.booked).length < numSeats) {
        alert('Not enough available seats.');
        return;
      }

      // Create an array of rows
      const rows: Seat[][] = [];
      for (let i = 0; i < totalSeats; i += seatsPerRow) {
        rows.push(updatedSeats.slice(i, i + seatsPerRow));
      }

      let seatsToBook: Seat[] = [];

      // Find the first row with enough consecutive seats
      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const currentRow = rows[rowIndex];
        let consecutiveCount = 0;
        let startIndex = -1;

        // Count consecutive available seats in the current row
        for (let i = 0; i < currentRow.length; i++) {
          if (!currentRow[i].booked) {
            if (consecutiveCount === 0) startIndex = i;
            consecutiveCount++;
            
            if (consecutiveCount === numSeats) {
              // Check if these seats would cross row boundary
              if (startIndex + numSeats <= seatsPerRow) {
                // Found enough consecutive seats in this row
                seatsToBook = currentRow.slice(startIndex, startIndex + numSeats);
                break;
              }
            }
          } else {
            consecutiveCount = 0;
            startIndex = -1;
          }
        }

        // If we haven't found enough consecutive seats and we're at the start of a new row
        if (seatsToBook.length === 0 && consecutiveCount >= numSeats) {
          seatsToBook = currentRow.slice(startIndex, startIndex + numSeats);
        }

        if (seatsToBook.length === numSeats) break;
      }

      // If we couldn't find consecutive seats in any row
      if (seatsToBook.length < numSeats) {
        alert('Unable to find enough consecutive seats in a single row.');
        return;
      }

      // Extract seat IDs to book
      const selectedSeatIds = seatsToBook.map((seat) => seat.seat_id);

      // Send booking request to backend
      const response = await axios.post(`${API_URL}/api/bookings/reserve`, {
        seatIds: selectedSeatIds,
      });

      alert(response.data.message);
      const updatedSeatsAfterBooking = await fetchSeats();
      setSeats([...updatedSeatsAfterBooking]);

    } catch (error) {
      console.error('Error booking seats:', error);
      alert('Failed to book seats');
    } finally {
      setLoading(false);
    }
  };


  // Reset all seats
  const resetAllSeats = async () => {
    try {
      const response = await axios.post(`${API_URL}/api/bookings/reset`);
      alert(response.data.message);
      fetchSeats();
    } catch (error) {
      console.error('Error resetting seats:', error);
      alert('Failed to reset seats');
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-2xl text-black font-bold mb-4">Ticket Booking</h1>
      <div className="grid grid-cols-7 gap-2 mb-6">
        {seats.map((seat, index) => (
          <div
            key={index} // Use index as a temporary key
            className={`w-8 h-8 flex items-center justify-center rounded ${
              seat.status === 'available' ? 'bg-green-500' : 'bg-yellow-500'
            } text-white`}
          >
            {seat.seat_id}
          </div>
        ))}
      </div>

      <div className="flex items-center space-x-2 mb-4">
        <input
          type="number"
          value={numSeats}
          onChange={(e) => setNumSeats(Number(e.target.value))}
          className="p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter number of seats"
        />
        <button
          onClick={bookSeats}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {loading ? 'Booking...' : 'Book'}
        </button>
      </div>

      <div className="mt-4">
        <span className="mr-4 text-black">
          Booked Seats: {seats.filter((seat) => seat.status === 'booked').length}
        </span>
        <span className="text-black">
          Available Seats: {seats.filter((seat) => seat.status === 'available').length}
        </span>
      </div>

      <button
        onClick={resetAllSeats}
        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 mt-4"
      >
        Reset All Seats
      </button>
    </main>
  );
};

export default Home;
