import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Button, FlatList, Alert } from 'react-native';
import { Calendar } from 'react-native-calendars';
import * as Notifications from 'expo-notifications';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { Audio } from 'expo-av';

// ✅ Use a Direct Link to an MP3 File
const AUDIO_URL = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"; 

// Set notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function PersonalAssistantApp() {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [title, setTitle] = useState('');
  const [tasks, setTasks] = useState({});
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

  const alarmSound = useRef(null);

  useEffect(() => {
    // ✅ Load Alarm Sound
    const loadSound = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync({ uri: AUDIO_URL });
        alarmSound.current = sound;
      } catch (error) {
        console.log('Error loading sound:', error);
        Alert.alert("Audio Error", "Failed to load alarm sound");
      }
    };
    loadSound();

    return () => {
      if (alarmSound.current) {
        alarmSound.current.unloadAsync();
      }
    };
  }, []);

  const playAlarmSound = async () => {
    if (alarmSound.current) {
      try {
        await alarmSound.current.setIsLoopingAsync(true); // ✅ Loop the alarm
        await alarmSound.current.replayAsync();

        // ✅ Stop the alarm after 1 min
        setTimeout(async () => {
          await alarmSound.current.stopAsync();
          await alarmSound.current.setIsLoopingAsync(false);
        }, 60000);
      } catch (error) {
        console.log('Error playing sound:', error);
        Alert.alert("Audio Error", "Couldn't play alarm sound");
      }
    } else {
      Alert.alert("Audio Error", "Alarm sound is not loaded");
    }
  };

  const scheduleReminder = async (date, time, title) => {
    if (!date) {
      Alert.alert("Error", "Please select a date first.");
      return;
    }
    if (!title.trim()) {
      Alert.alert("Error", "Task title cannot be empty.");
      return;
    }

    // Set event time
    const eventDateTime = new Date(date);
    eventDateTime.setHours(time.getHours(), time.getMinutes(), 0);

    // Schedule notification (1 hour before event)
    const notificationTime = new Date(eventDateTime.getTime() - 60 * 60 * 1000);
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Upcoming Event', body: `"${title}" at ${new Date(time).toLocaleTimeString()}"` },
      trigger: { date: notificationTime },
    });

    // Schedule alarm (15 minutes before event)
    const alarmTime = new Date(eventDateTime.getTime() - 15 * 60 * 1000);
    setTimeout(playAlarmSound, alarmTime.getTime() - new Date().getTime());

    setTasks((prevTasks) => {
      const updatedTasks = { ...prevTasks };
      if (!updatedTasks[date]) {
        updatedTasks[date] = [];
      }
      updatedTasks[date].push({ title, time: eventDateTime.toISOString() });

      // Sort tasks by time
      updatedTasks[date].sort((a, b) => new Date(a.time) - new Date(b.time));

      return updatedTasks;
    });

    setTitle('');
    Alert.alert('Reminder Set!', `"${title}" added on ${date} at ${new Date(time).toLocaleTimeString()}`);
  };

  return (
    <View style={{ flex: 1, padding: 20, marginTop: 50 }}>
      <Calendar
        onDayPress={(day) => setSelectedDate(day.dateString)}
        markedDates={{ [selectedDate]: { selected: true } }}
      />
      {selectedDate && (
        <View>
          <TextInput
            placeholder="Enter Task Title"
            value={title}
            onChangeText={setTitle}
            style={{ borderWidth: 1, marginVertical: 10, padding: 8 }}
          />
          <Button title="Select Time" onPress={() => setDatePickerVisibility(true)} />
          <DateTimePickerModal
            isVisible={isDatePickerVisible}
            mode="time"
            onConfirm={(time) => {
              setSelectedTime(time);
              setDatePickerVisibility(false);
            }}
            onCancel={() => setDatePickerVisibility(false)}
          />
          <Button title="Set Reminder" onPress={() => scheduleReminder(selectedDate, selectedTime, title)} />
        </View>
      )}
      {selectedDate && tasks[selectedDate] && (
        <View>
          <Text style={{ fontSize: 18, marginTop: 10 }}>Today's Schedule</Text>
          <FlatList
            data={tasks[selectedDate]}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <Text>{`${new Date(item.time).toLocaleTimeString()} - ${item.title}`}</Text>
            )}
          />
        </View>
      )}
    </View>
  );
}
