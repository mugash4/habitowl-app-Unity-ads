import React from 'react';
import AISupportChat from './AISupportChat';

// Wrapper component for backward compatibility
const ContactSupport = ({ visible, onDismiss }) => {
  return <AISupportChat visible={visible} onDismiss={onDismiss} />;
};

export default ContactSupport;
