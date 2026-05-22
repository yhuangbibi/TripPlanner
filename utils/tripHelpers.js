export const parseStartDate = (dateStr) => {
  const months = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
  };
  const match = dateStr.match(/(\w+)\s+(\d+).*,\s*(\d{4})/);
  if (!match) return new Date(0);
  return new Date(parseInt(match[3]), months[match[1]], parseInt(match[2]));
};

export const parseDate = (str) => {
  const [year, month, day] = str.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

export const formatDisplayDate = (str) => {
  const d = parseDate(str);
  if (!d) return str;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const getStatus = (startStr, endStr, airTicket) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = parseDate(endStr);
  if (end && end < today) return 'Completed';
  if (airTicket.trim().length > 0) return 'Upcoming';
  return 'Planning';
};

export const statusOrder = { Upcoming: 0, Planning: 1, Completed: 2 };

export const statusColors = {
  Upcoming:  { bg: '#e8f4ff', text: '#0066cc' },
  Planning:  { bg: '#fff8e8', text: '#cc8800' },
  Completed: { bg: '#e8f8ee', text: '#007a33' },
};

export const getHotelGaps = (startStr, endStr, hotel) => {
  if (!hotel?.name || !hotel?.checkIn || !hotel?.checkOut) return null;

  const tripStart = parseDate(startStr);
  const tripEnd = parseDate(endStr);
  const hotelStart = parseDate(hotel.checkIn);
  const hotelEnd = parseDate(hotel.checkOut);

  const gaps = [];

  // Check days before hotel check-in
  if (hotelStart > tripStart) {
    gaps.push({ from: tripStart, to: new Date(hotelStart.getTime() - 86400000) });
  }

  // Check days after hotel check-out
  if (hotelEnd < tripEnd) {
    gaps.push({ from: new Date(hotelEnd.getTime() + 86400000), to: tripEnd });
  }

  return gaps.length > 0 ? gaps : null;
};

export const formatShortDate = (date) =>
  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });