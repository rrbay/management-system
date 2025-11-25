// Hotel Blokaj mail template
// "Dear Colleagues, attached update for [Month]..."

export function buildHotelBlockEmailBody(month: string): string {
  return `Dear Colleagues,

Attached you will find update information about the crews accommodations scheduled for ${month}, wish you a good day.`;
}

// Ay adını tarihten çıkar (örn: "December")
export function getMonthName(date: Date): string {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return monthNames[date.getMonth()];
}
