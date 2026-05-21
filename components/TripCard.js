import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { formatDisplayDate, statusColors } from '../utils/tripHelpers';

export default function TripCard({ destination, origin, startDate, endDate, airTicket, hotel, tripType, receipts, status, onEdit, onDelete }) {
  const colors = statusColors[status];
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.destination}>{destination}</Text>
        <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
          <Text style={[styles.statusText, { color: colors.text }]}>{status}</Text>
        </View>
      </View>
      <Text style={styles.origin}>From: {origin}</Text>
      <Text style={styles.dates}>
        {formatDisplayDate(startDate)} – {formatDisplayDate(endDate)}
      </Text>
      {airTicket ? <Text style={styles.detail}>✈️  {airTicket}</Text> : null}
      {hotel ? <Text style={styles.detail}>🏨  {hotel}</Text> : null}
      {airTicket && !hotel && (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>💡 No hotel booked yet</Text>
        </View>
      )}
      {tripType && (
        <Text style={styles.detail}>
          {tripType === 'Personal' ? '🧳' : tripType === 'Business' ? '💼' : '✨'}  {tripType}
          {tripType === 'Business' && receipts?.length > 0
            ? `  •  ${receipts.length} receipt${receipts.length > 1 ? 's' : ''}`
            : ''}
        </Text>
      )}
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.editButton} onPress={onEdit}>
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={() =>
          Alert.alert('Delete trip', `Remove ${destination}?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: onDelete },
          ])
        }>
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  destination: { fontSize: 18, fontWeight: '600', flex: 1, marginRight: 8 },
  origin: { fontSize: 13, color: '#888', marginBottom: 2 },
  dates: { fontSize: 14, color: '#888', marginBottom: 8 },
  detail: { fontSize: 13, color: '#555', marginTop: 2 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '500' },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: '#eee' },
  editButton: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8, borderWidth: 0.5, borderColor: '#0066cc' },
  editButtonText: { color: '#0066cc', fontSize: 13, fontWeight: '500' },
  deleteButton: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8, borderWidth: 0.5, borderColor: '#cc0000' },
  deleteButtonText: { color: '#cc0000', fontSize: 13, fontWeight: '500' },
  notice: { 
    marginTop: 8, 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    backgroundColor: '#f5f0ff', 
    borderRadius: 8, 
    alignSelf: 'flex-start' 
  },
  noticeText: { 
    fontSize: 12, 
    color: '#7c5cbf' 
  },
});