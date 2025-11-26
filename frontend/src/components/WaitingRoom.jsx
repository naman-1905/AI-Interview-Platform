import React, { useState, useEffect } from 'react';
import { Users, Clock, CheckCircle, AlertCircle } from 'lucide-react';

export default function WaitingArea() {
  const [status, setStatus] = useState('checking'); // checking, waiting, admitted, error
  const [activeCount, setActiveCount] = useState(0);
  const [queuePosition, setQueuePosition] = useState(null);
  const [message, setMessage] = useState('');
  const MAX_PARTICIPANTS = 3;

  // Check session count on component mount
  useEffect(() => {
    checkAndJoin();
  }, []);

  const checkAndJoin = async () => {
    try {
      setStatus('checking');
      setMessage('Checking availability...');

      // API call to check active participants in the meeting
      // Replace with your actual API endpoint
      const activePeopleResponse = await fetch('/api/meeting/active-count');
      const { count: activeParticipants } = await activePeopleResponse.json();
      // Placeholder: const activeParticipants = await fetchActiveMeetingCount();
      
      setActiveCount(activeParticipants);

      if (activeParticipants < MAX_PARTICIPANTS) {
        // Slot available - admit user immediately and redirect
        setStatus('admitted');
        setMessage('Slot available! Joining interview now...');
        
        // Redirect to interview room
        setTimeout(() => {
          window.location.href = '/interview';
        }, 1500);
      } else {
        // Room is full - check queue position
        // Replace with your actual API endpoint
        const queueResponse = await fetch('/api/queue/position');
        const { position } = await queueResponse.json();
        // Placeholder: const position = await fetchQueuePosition();
        
        setQueuePosition(position);
        setStatus('waiting');
        setMessage('The interview room is currently full. You have been placed in the waiting room.');
        
        // Start polling for available slots
        startPolling();
      }
    } catch (error) {
      console.error('Error checking availability:', error);
      setStatus('error');
      setMessage('Failed to connect to the interview system. Please try again.');
    }
  };

  const startPolling = () => {
    // Poll every 3 seconds to check if a slot opened
    const pollInterval = setInterval(async () => {
      try {
        // API call to check active participants
        // Replace with your actual API endpoint
        const activePeopleResponse = await fetch('/api/meeting/active-count');
        const { count: activeParticipants } = await activePeopleResponse.json();
        // Placeholder: const activeParticipants = await fetchActiveMeetingCount();
        
        setActiveCount(activeParticipants);

        // API call to check current queue position
        // Replace with your actual API endpoint
        const queueResponse = await fetch('/api/queue/position');
        const { position } = await queueResponse.json();
        // Placeholder: const position = await fetchQueuePosition();
        
        setQueuePosition(position);

        // If slot is available, admit user
        if (activeParticipants < MAX_PARTICIPANTS) {
          clearInterval(pollInterval);
          setStatus('admitted');
          setMessage('A spot has opened! Redirecting to interview room...');
          
          // Redirect to interview room
          setTimeout(() => {
            window.location.href = '/interview';
          }, 2000);
        }
      } catch (error) {
        console.error('Polling error:', error);
        // Continue polling even if there's an error
      }
    }, 3000);

    // Cleanup on unmount
    return () => clearInterval(pollInterval);
  };

  const StatusDisplay = () => {
    switch (status) {
      case 'checking':
        return (
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full animate-pulse">
              <Users className="w-10 h-10 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Checking Availability</h2>
              <p className="text-gray-600">Please wait while we check for available slots...</p>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        );

      case 'waiting':
        return (
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-100 rounded-full animate-pulse">
              <Clock className="w-10 h-10 text-yellow-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Waiting Room</h2>
              <p className="text-gray-600">{message}</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md mx-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 font-medium">Active Participants:</span>
                  <span className="text-gray-900 font-bold">{activeCount} / {MAX_PARTICIPANTS}</span>
                </div>
                {queuePosition !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 font-medium">Your Position in Queue:</span>
                    <span className="text-gray-900 font-bold">#{queuePosition}</span>
                  </div>
                )}
                <div className="pt-4 border-t border-yellow-200">
                  <p className="text-sm text-gray-600">
                    You will be automatically redirected when a slot becomes available. Please keep this page open.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        );

      case 'admitted':
        return (
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Admitted!</h2>
              <p className="text-gray-600">{message}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 max-w-md mx-auto">
              <div className="space-y-3">
                <div className="flex items-center justify-center space-x-2 text-green-700">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Access Granted</span>
                </div>
                <p className="text-sm text-gray-600">
                  Redirecting to interview room...
                </p>
              </div>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Connection Error</h2>
              <p className="text-red-600">{message}</p>
            </div>
            <button
              onClick={checkAndJoin}
              className="bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl">
        <div className="mb-6 text-center">
          <div className="inline-block px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold mb-4">
            Interview Meeting
          </div>
        </div>
        
        <StatusDisplay />
      </div>
    </div>
  );
}