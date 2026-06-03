import { useState, useRef } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  Alert, KeyboardAvoidingView, Platform, Modal, Image, ScrollView
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { parseDate, getStatus, formatDisplayDate, detectAirline } from '../utils/tripHelpers';




export default function AddTripForm({ onAdd, onCancel, initialValues = null }) {
  const [origin, setOrigin] = useState(initialValues?.origin || '');
  const [destination, setDestination] = useState(initialValues?.destination || '');
  const [startDate, setStartDate] = useState(
    initialValues ? parseDate(initialValues.startDate) : new Date()
  );
  const [endDate, setEndDate] = useState(
    initialValues ? parseDate(initialValues.endDate) : new Date()
  );
  const [airTicket, setAirTicket] = useState(initialValues?.airTicket || '');
  const [hotelName, setHotelName] = useState(initialValues?.hotel?.name || '');
  const [hotelCheckIn, setHotelCheckIn] = useState(
    initialValues?.hotel?.checkIn ? parseDate(initialValues.hotel.checkIn) : new Date()
  );
  const [hotelCheckOut, setHotelCheckOut] = useState(
    initialValues?.hotel?.checkOut ? parseDate(initialValues.hotel.checkOut) : new Date()
  );
  const [showHotelCheckInPicker, setShowHotelCheckInPicker] = useState(false);
  const [showHotelCheckOutPicker, setShowHotelCheckOutPicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [tripType, setTripType] = useState(initialValues?.tripType || 'Personal');
  const [receipts, setReceipts] = useState(initialValues?.receipts || []);
  const [detectedHotel, setDetectedHotel] = useState(null);
  const [detectingHotel, setDetectingHotel] = useState(false);
  const [detectedAirline, setDetectedAirline] = useState(
    initialValues?.airTicket ? detectAirline(initialValues.airTicket) : null
  );
  const hotelDetectTimer = useRef(null);
  const handleHotelChange = (text) => {
    setHotelName(text);
    setDetectedHotel(null);
    clearTimeout(hotelDetectTimer.current);
    hotelDetectTimer.current = setTimeout(() => {
      detectHotelInfo(text);
    }, 800); // wait 800ms after user stops typing
  };
  const formatDisplay = (date) =>
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const toDateString = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  const detectLocation = async () => {
    setDetectingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Please allow location access in your iPhone Settings to use this feature.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });

      const geocoded = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (geocoded.length > 0) {
        const place = geocoded[0];
        const cityName = [place.city, place.region, place.country]
          .filter(Boolean)
          .join(', ');
        setOrigin(cityName);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not detect location. Please enter it manually.');
    } finally {
      setDetectingLocation(false);
    }
  };

  const handleSubmit = () => {
    if (!origin.trim() || !destination.trim()) {
      Alert.alert('Missing fields', 'Please fill in origin and destination.');
      return;
    }
    if (startDate > endDate) {
      Alert.alert('Invalid dates', 'Start date cannot be later than end date.');
      return;
    }

    const startStr = toDateString(startDate);
    const endStr = toDateString(endDate);
    const status = getStatus(startStr, endStr, airTicket);

    // Gentle reminder if air ticket entered but no hotel
    if (airTicket.trim().length > 0 && !hotelName.trim()) {
      Alert.alert(
        'Just a reminder',
        'You have an air ticket but no hotel booked yet. You can always edit this trip later.',
        [{ text: 'Got it', onPress: () => onAdd(buildTrip(startStr, endStr, status)) }]
      );
      return;
    }

    onAdd(buildTrip(startStr, endStr, status));
  };
  const buildTrip = (startStr, endStr, status) => ({
    id: initialValues?.id || Date.now(),
    origin,
    destination,
    startDate: startStr,
    endDate: endStr,
    airTicket,
    airline: detectedAirline,
    hotel: hotelName.trim() ? {
      name: hotelName,
      checkIn: toDateString(hotelCheckIn),
      checkOut: toDateString(hotelCheckOut),
    } : null,
    tripType,
    receipts,
    status,
    dates: `${formatDisplay(startDate)} – ${formatDisplay(endDate)}, ${startDate.getFullYear()}`,
  });
  const pickReceipt = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Please allow photo library access in Settings.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newReceipts = result.assets.map(asset => ({
        id: Date.now() + Math.random(),
        uri: asset.uri,
        name: asset.fileName || `receipt_${Date.now()}.jpg`,
      }));
      setReceipts(prev => [...prev, ...newReceipts]);
    }
  };
  const detectHotelInfo = async (text) => {
    if (text.trim().length < 3) {
      setDetectedHotel(null);
      return;
    }
    setDetectingHotel(true);
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 100,
          messages: [{
            role: 'user',
            content: `From this hotel booking text, extract only the full hotel name. If you cannot identify a specific hotel name, return null. Return JSON only: {"hotelName": "Full Hotel Name"} or {"hotelName": null}. Text: "${text}"`
          }]
        })
      });
      const data = await response.json();
      const result = JSON.parse(data.content[0].text);
      setDetectedHotel(result.hotelName);
    } catch {
      setDetectedHotel(null);
    } finally {
      setDetectingHotel(false);
    }
  };
  const removeReceipt = (id) => {
    setReceipts(prev => prev.filter(r => r.id !== id));
  };
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.form}>
        <Text style={styles.formTitle}>{initialValues ? 'Edit Trip' : 'Add New Trip'}</Text>

        <Text style={styles.label}>Current location *</Text>
        <View style={styles.locationRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="e.g. Sunnyvale, CA"
            value={origin}
            onChangeText={setOrigin}
          />
          <TouchableOpacity
            style={styles.locationButton}
            onPress={detectLocation}
            disabled={detectingLocation}
          >
            <Text style={styles.locationButtonText}>
              {detectingLocation ? '...' : '📍'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Destination *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Tokyo, Japan"
          value={destination}
          onChangeText={setDestination}
        />

        {/* Start Date */}
        <Text style={styles.label}>Start date *</Text>
        <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartPicker(true)}>
          <Text style={styles.dateButtonText}>📅  {formatDisplay(startDate)}</Text>
        </TouchableOpacity>

        {/* End Date */}
        <Text style={styles.label}>End date *</Text>
        <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndPicker(true)}>
          <Text style={styles.dateButtonText}>📅  {formatDisplay(endDate)}</Text>
        </TouchableOpacity>

        {/* Start Date Picker Modal */}
        {/* Start Date Picker Modal */}
        <Modal transparent visible={showStartPicker} animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Start Date</Text>
                <TouchableOpacity onPress={() => setShowStartPicker(false)}>
                  <Text style={styles.modalDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={startDate}
                mode="date"
                display="inline"
                style={{ height: 200, width: '100%' }}   
                onChange={(event, selected) => {
                  if (selected) setStartDate(selected);
                }}
              />
            </View>
          </View>
        </Modal>

        {/* End Date Picker Modal */}
        <Modal transparent visible={showEndPicker} animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select End Date</Text>
                <TouchableOpacity onPress={() => setShowEndPicker(false)}>
                  <Text style={styles.modalDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={endDate}
                mode="date"
                display="inline"
                minimumDate={startDate}
                style={{ height: 200, width: '100%' }}   
                onChange={(event, selected) => {
                  if (selected) setEndDate(selected);
                }}
              />
            </View>
          </View>
        </Modal>

        <Text style={styles.label}>Air ticket / booking ref (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. UA123 or ABC123"
          value={airTicket}
          onChangeText={(text) => {
            setAirTicket(text);
            setDetectedAirline(detectAirline(text));
          }}
        />
        {detectedAirline && (
          <View style={styles.detectedBadge}>
            <Text style={styles.detectedText}>✈️  {detectedAirline}</Text>
          </View>
        )}

        <Text style={styles.label}>Hotel (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Hilton Tokyo or paste booking ref"
          value={hotelName}
          onChangeText={handleHotelChange}
        />
        {detectingHotel && (
          <Text style={styles.detectingText}>Looking up hotel...</Text>
        )}
        {detectedHotel && detectedHotel !== hotelName && (
          <View style={styles.detectedBadge}>
            <Text style={styles.detectedText}>🏨  {detectedHotel}</Text>
            <TouchableOpacity onPress={() => setHotelName(detectedHotel)}>
              <Text style={styles.useThisText}>Use this</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Only show hotel dates if a hotel name is entered */}
        {hotelName.trim().length > 0 && (
          <>
            <Text style={styles.label}>Hotel check-in *</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowHotelCheckInPicker(true)}>
              <Text style={styles.dateButtonText}>📅  {formatDisplay(hotelCheckIn)}</Text>
            </TouchableOpacity>

            <Text style={styles.label}>Hotel check-out *</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowHotelCheckOutPicker(true)}>
              <Text style={styles.dateButtonText}>📅  {formatDisplay(hotelCheckOut)}</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Hotel Check-in Picker Modal */}
        <Modal transparent visible={showHotelCheckInPicker} animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Hotel check-in</Text>
                <TouchableOpacity onPress={() => setShowHotelCheckInPicker(false)}>
                  <Text style={styles.modalDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={hotelCheckIn}
                mode="date"
                display="inline"
                minimumDate={startDate}
                maximumDate={endDate}
                textColor="#000000"
                accentColor="#0066cc"
                onChange={(event, selected) => {
                  if (selected) setHotelCheckIn(selected);
                }}
              />
            </View>
          </View>
        </Modal>

        {/* Hotel Check-out Picker Modal */}
        <Modal transparent visible={showHotelCheckOutPicker} animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Hotel check-out</Text>
                <TouchableOpacity onPress={() => setShowHotelCheckOutPicker(false)}>
                  <Text style={styles.modalDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={hotelCheckOut}
                mode="date"
                display="inline"
                minimumDate={hotelCheckIn}
                maximumDate={endDate}
                textColor="#000000"
                accentColor="#0066cc"
                onChange={(event, selected) => {
                  if (selected) setHotelCheckOut(selected);
                }}
              />
            </View>
          </View>
        </Modal>
        {/* Trip Type */}
        <Text style={styles.label}>Trip type *</Text>
        <View style={styles.tripTypeRow}>
          {['Personal', 'Business', 'Other'].map(type => (
            <TouchableOpacity
              key={type}
              style={[styles.tripTypeButton, tripType === type && styles.tripTypeButtonActive]}
              onPress={() => setTripType(type)}
            >
              <Text style={[styles.tripTypeText, tripType === type && styles.tripTypeTextActive]}>
                {type === 'Personal' ? '🧳 Personal' : type === 'Business' ? '💼 Business' : '✨ Other'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Receipts — only shown for Business */}
        {tripType === 'Business' && (
          <View style={styles.receiptSection}>
            <View style={styles.receiptHeader}>
              <Text style={styles.label}>Receipts for reimbursement</Text>
              <TouchableOpacity style={styles.uploadButton} onPress={pickReceipt}>
                <Text style={styles.uploadButtonText}>+ Upload</Text>
              </TouchableOpacity>
            </View>

            {receipts.length === 0 ? (
              <Text style={styles.receiptEmpty}>No receipts uploaded yet</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.receiptScroll}>
                {receipts.map(receipt => (
                  <View key={receipt.id} style={styles.receiptThumb}>
                    <Image source={{ uri: receipt.uri }} style={styles.receiptImage} />
                    <TouchableOpacity
                      style={styles.receiptRemove}
                      onPress={() => removeReceipt(receipt.id)}
                    >
                      <Text style={styles.receiptRemoveText}>✕</Text>
                    </TouchableOpacity>
                    <Text style={styles.receiptName} numberOfLines={1}>{receipt.name}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        )}
        <Text style={styles.hint}>
          Status is set automatically:{'\n'}
          • Air ticket entered → Upcoming{'\n'}
          • No ticket → Planning{'\n'}
          • End date in the past → Completed
        </Text>

        <TouchableOpacity style={styles.addButton} onPress={handleSubmit}>
          <Text style={styles.addButtonText}>{initialValues ? 'Save Changes' : 'Save Trip'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}


const styles = StyleSheet.create({
  form: { backgroundColor: 'white', borderRadius: 16, padding: 20, marginBottom: 20 },
  formTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  label: { fontSize: 13, color: '#555', marginBottom: 4, marginTop: 10 },
  input: { borderWidth: 0.5, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 15, backgroundColor: '#fafafa' },
  hint: { fontSize: 12, color: '#aaa', marginTop: 14, lineHeight: 20 },
  addButton: { backgroundColor: '#0066cc', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 20 },
  addButtonText: { color: 'white', fontWeight: '600', fontSize: 16 },
  cancelButton: { borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  cancelButtonText: { color: '#888', fontSize: 15 },
  dateButton: { borderWidth: 0.5, borderColor: '#ddd', borderRadius: 8, padding: 12, backgroundColor: '#fafafa', marginBottom: 4 },
  dateButtonText: { fontSize: 15, color: '#333' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationButton: { width: 44, height: 44, borderRadius: 8, borderWidth: 0.5, borderColor: '#ddd', backgroundColor: '#fafafa', alignItems: 'center', justifyContent: 'center' },
  locationButtonText: { fontSize: 20 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' },
  modalContent: { backgroundColor: '#aac9e9ff', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 40, paddingHorizontal: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 15, fontWeight: '500' },
  modalDone: { fontSize: 15, color: '#0066cc', fontWeight: '600' },
  tripTypeRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  tripTypeButton: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 0.5, borderColor: '#ddd', alignItems: 'center', backgroundColor: '#fafafa' },
  tripTypeButtonActive: { backgroundColor: '#e8f4ff', borderColor: '#0066cc' },
  tripTypeText: { fontSize: 13, color: '#888' },
  tripTypeTextActive: { color: '#0066cc', fontWeight: '500' },
  receiptSection: { marginTop: 12, padding: 12, backgroundColor: '#fafafa', borderRadius: 8, borderWidth: 0.5, borderColor: '#ddd' },
  receiptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  receiptEmpty: { fontSize: 13, color: '#aaa', textAlign: 'center', paddingVertical: 12 },
  receiptScroll: { marginTop: 4 },
  receiptThumb: { width: 90, marginRight: 10, position: 'relative' },
  receiptImage: { width: 90, height: 90, borderRadius: 8, backgroundColor: '#eee' },
  receiptRemove: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  receiptRemoveText: { color: 'white', fontSize: 10, fontWeight: '600' },
  receiptName: { fontSize: 10, color: '#888', marginTop: 4, textAlign: 'center' },
  uploadButton: { backgroundColor: '#0066cc', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  uploadButtonText: { color: 'white', fontSize: 13, fontWeight: '500' },
  detectedBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginTop: 6, 
    padding: 10, 
    backgroundColor: '#f0f7ff', 
    borderRadius: 8, 
    borderWidth: 0.5, 
    borderColor: '#b3d4f5' 
  },
  detectedText: { fontSize: 13, color: '#0055aa' },
  useThisText: { fontSize: 13, color: '#0066cc', fontWeight: '600' },
  detectingText: { fontSize: 12, color: '#aaa', marginTop: 4, paddingLeft: 2 },
});

  