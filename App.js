import { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import TripCard from './components/TripCard';
import AddTripForm from './components/AddTripForm';
import { statusOrder, parseDate } from './utils/tripHelpers';

export default function App() {
  const [trips, setTrips] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);

  const handleAdd = (newTrip) => {
    if (editingTrip) {
      setTrips(prev => prev.map(t => t.id === newTrip.id ? newTrip : t));
      setEditingTrip(null);
    } else {
      setTrips(prev => [...prev, newTrip]);
    }
    setShowForm(false);
  };

  const handleEdit = (trip) => {
    setEditingTrip(trip);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    setTrips(prev => prev.filter(t => t.id !== id));
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingTrip(null);
  };

  const sortedTrips = [...trips].sort((a, b) => {
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    return parseDate(a.startDate) - parseDate(b.startDate);
  });

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.headerRow}>
        <Text style={styles.header}>My Trips</Text>
        {!showForm && (
          <TouchableOpacity style={styles.newButton} onPress={() => setShowForm(true)}>
            <Text style={styles.newButtonText}>+ New</Text>
          </TouchableOpacity>
        )}
      </View>

      {showForm && (
        <AddTripForm
          onAdd={handleAdd}
          onCancel={handleCancel}
          initialValues={editingTrip}
        />
      )}

      {sortedTrips.length === 0 && !showForm ? (
        <Text style={styles.empty}>No trips yet. Tap + New to add one!</Text>
      ) : (
        sortedTrips.map(trip => (
          <TripCard
            key={trip.id}
            {...trip}
            onEdit={() => handleEdit(trip)}
            onDelete={() => handleDelete(trip.id)}
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 20, paddingTop: 60 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  header: { fontSize: 28, fontWeight: '600' },
  newButton: { backgroundColor: '#0066cc', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  newButtonText: { color: 'white', fontWeight: '600', fontSize: 14 },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 60, fontSize: 15 },
});