import React, { useState } from 'react';
import { cn } from '@/src/lib/utils';
import { Contact } from '@/src/components/CalendarEvent/calendar-event.types';
import { Icon } from '@/src/components/ui/icon';
import { mdiCheck, mdiClose, mdiPlus, mdiPhone, mdiEmail, mdiPencil, mdiAccount } from '@mdi/js';
import { Input } from '@/src/components/ui/input';
import { Button } from '@/src/components/ui/button';
import ContactForm from '@/src/components/forms/ContactForm';
import { useLocalization } from '@/src/context/localization';

interface ContactSelectorProps {
  contacts: Contact[];
  selectedContactIds: string[];
  onContactsChange: (contactIds: string[]) => void;
  onAddNewContact?: (contact: Contact) => void;
  onEditContact?: (contact: Contact) => void;
  onDeleteContact?: (contactId: string) => void;
}

/**
 * ContactSelector Component
 * 
 * A subcomponent of CalendarEventForm that handles the selection of contacts
 * for calendar events.
 */
const ContactSelector: React.FC<ContactSelectorProps> = ({
  contacts,
  selectedContactIds,
  onContactsChange,
  onAddNewContact,
  onEditContact,
  onDeleteContact,
}) => {

  const { t } = useLocalization();
  const [searchTerm, setSearchTerm] = useState('');
  const [showContactForm, setShowContactForm] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  // Note: Contacts are fetched by the parent component (CalendarDayView)
  // We don't need to fetch them here to avoid duplicate API calls
  
  // Filter contacts based on search term
  const filteredContacts = contacts.filter(contact => 
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.role.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Get selected contacts
  const selectedContacts = contacts.filter(contact => 
    selectedContactIds.includes(contact.id)
  );
  
  // Toggle contact selection
  const toggleContact = (contactId: string) => {  

    if (selectedContactIds.includes(contactId)) {
      onContactsChange(selectedContactIds.filter(id => id !== contactId));
    } else {
      onContactsChange([...selectedContactIds, contactId]);
    }
  };
  
  // Remove contact from selection
  const removeContact = (contactId: string) => {
    onContactsChange(selectedContactIds.filter(id => id !== contactId));
  };
  
  // Group contacts by role
  const contactsByRole = filteredContacts.reduce<Record<string, Contact[]>>((acc, contact) => {
    if (!acc[contact.role]) {
      acc[contact.role] = [];
    }
    acc[contact.role].push(contact);
    return acc;
  }, {});
  
  
  // Handle saving a contact
  const handleSaveContact = async (contactData: any) => {
    setIsLoading(true);

    try {
      // The ContactForm component handles the API call and returns the saved contact

      // Determine if this is a new contact or an edit
      const isNewContact = !selectedContact?.id;

      // Update the parent component with the saved contact
      if (isNewContact && onAddNewContact) {
        // For new contacts: add to the list and auto-select
        onAddNewContact(contactData);

        // Auto-select the newly added contact if it has an ID
        if (contactData.id) {
          onContactsChange([...selectedContactIds, contactData.id]);
        }
      } else if (!isNewContact && onEditContact) {
        // For existing contacts: update the contact in the list
        onEditContact(contactData);
      }

      // Close the form after updating
      setShowContactForm(false);
      setSelectedContact(undefined);
    } catch (error) {
      console.error('Error handling saved contact:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle deleting a contact
  const handleDeleteContact = async (contactId: string) => {
    if (onDeleteContact) {
      setIsLoading(true);

      try {
        // Update the parent component (remove from contacts list)
        onDeleteContact(contactId);

        // Remove the contact from selection if it's selected
        if (selectedContactIds.includes(contactId)) {
          onContactsChange(selectedContactIds.filter(id => id !== contactId));
        }

        // Close the form after deletion
        setShowContactForm(false);
        setSelectedContact(undefined);
      } catch (error) {
        console.error('Error handling contact deletion:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  return (
    <div className="space-y-2">
      {/* Search input */}
      <div className="relative">
        <Input
          type="text"
          placeholder={t("Search contacts...")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="contact-selector-clear-button absolute right-2 top-2 text-gray-400 hover:text-gray-600"
          >
            <Icon path={mdiClose} size="1rem" />
          </button>
        )}
      </div>
      
      {/* Contact list */}
      <div className="contact-selector-list max-h-40 overflow-y-auto rounded-md border border-gray-300 bg-white p-1 calendar-event-form-multi-select">
        {Object.entries(contactsByRole).map(([role, roleContacts]) => (
          <div key={role} className="mb-2 last:mb-0">
            <div className="px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
              {role}
            </div>
            {roleContacts.map(contact => (
              <div
                key={contact.id}
                className={cn(
                  "contact-selector-item flex items-center px-2 py-1 rounded-md hover:bg-gray-100",
                  selectedContactIds.includes(contact.id) && "contact-selector-item-selected bg-teal-50",
                  'cursor-pointer flex justify-between'
                )}
              >
                <div 
                  className="flex-1 flex items-start"
                  onClick={() => toggleContact(contact.id)}
                >
                  <div className="flex-shrink-0 w-4 mt-1">
                    {selectedContactIds.includes(contact.id) && (
                      <Icon path={mdiCheck} size="1rem" className="contact-selector-check-icon text-teal-600" />
                    )}
                  </div>
                  <div className="ml-2 text-sm text-gray-700 contact-selector-contact-info">
                    <div className="font-medium">{contact.name}</div>
                    <div className="contact-selector-contact-details text-xs text-gray-500 flex flex-wrap gap-2">
                      {contact.phone && (
                        <span className="flex items-center">
                          <Icon path={mdiPhone} size="0.75rem" className="mr-1" />
                          {contact.phone}
                        </span>
                      )}
                      {contact.email && (
                        <span className="flex items-center">
                          <Icon path={mdiEmail} size="0.75rem" className="mr-1" />
                          {contact.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {onEditContact && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedContact(contact);
                      setShowContactForm(true);
                    }}
                    className="contact-selector-edit-button p-1 text-gray-400 hover:text-gray-600"
                    aria-label={t('Edit') + ' ' + contact.name}
                  >
                    <Icon path={mdiPencil} size="0.875rem" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ))}
        
        {filteredContacts.length === 0 && (
          <div className="contact-selector-empty-state p-2 text-sm text-gray-500 text-center">
            {searchTerm ? t('No contacts found') : t('No contacts available')}
          </div>
        )}
        
        {/* Contact Form */}
        <ContactForm
          isOpen={showContactForm}
          onClose={() => {
            setShowContactForm(false);
            setSelectedContact(undefined);
          }}
          contact={selectedContact}
          onSave={handleSaveContact}
          onDelete={handleDeleteContact}
          isLoading={isLoading}
        />
      </div>
      
      {/* Selected contacts */}
      {selectedContacts.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedContacts.map(contact => (
            <div key={contact.id} className="contact-selector-selected-tag flex items-center rounded-full bg-teal-100 px-2 py-1 text-xs text-teal-800">
              <Icon path={mdiAccount} size="0.75rem" className="contact-selector-selected-tag-icon mr-1 text-teal-600" />
              <span>{contact.name}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeContact(contact.id);
                }}
                className="contact-selector-remove-tag-button ml-1 h-3 w-3 text-teal-600 hover:text-teal-800"
              >
                <Icon path={mdiClose} size="0.75rem" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Add new contact button - moved to the bottom */}
      {onAddNewContact && (
        <div className="mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSelectedContact(undefined);
              setShowContactForm(true);
            }}
            className="w-full"
            size="sm"
          >
            <Icon path={mdiPlus} size="1rem" className="mr-1.5" />
            {t('Add New Contact')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ContactSelector;
