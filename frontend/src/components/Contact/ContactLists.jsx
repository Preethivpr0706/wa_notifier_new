import { useState, useEffect } from 'react';
import { contactService } from '../../api/contactService';
import { Trash2, Loader, ChevronRight, UserPlus, Search } from 'lucide-react';
import './ContactLists.css';
import AddListModal from './AddListModal';
import AddContactModal from './AddContactModal';

const ContactLists = () => {
  const [lists, setLists] = useState([]);
  const [selectedList, setSelectedList] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddListModal, setShowAddListModal] = useState(false);
  const [isAddingList, setIsAddingList] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch lists on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const listsResponse = await contactService.getLists();
        setLists(listsResponse.data);
      } catch (err) {
        setError(err.message || 'Failed to load contact lists');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch contacts when a list is selected
  useEffect(() => {
    if (selectedList) {
      const fetchContacts = async () => {
        try {
          setIsLoading(true);
          const contactsResponse = await contactService.getContacts(selectedList);
          setContacts(contactsResponse.data);
        } catch (err) {
          setError(err.message || 'Failed to load contacts');
        } finally {
          setIsLoading(false);
        }
      };
      fetchContacts();
    }
  }, [selectedList]);

  const handleDelete = async (contactId) => {
    try {
      await contactService.deleteContact(contactId);
      setContacts(contacts.filter(c => c.id !== contactId));
      setSuccessMessage('Contact deleted successfully');
    } catch (err) {
      setError(err.message || 'Failed to delete contact');
    }
  };

  const handleAddList = async (listName) => {
    try {
      setIsAddingList(true);
      const response = await contactService.createList({ name: listName });
      setLists(prevLists => [...prevLists, response.data]);
      setSuccessMessage('List created successfully');
    } catch (err) {
      setError(err.message || 'Failed to create list');
      throw err;
    } finally {
      setIsAddingList(false);
    }
  };

  const handleSaveContact = async (contactData) => {
    try {
      setIsLoading(true);
      let listId = contactData.listId;
      
      // Create new list if needed
      if (contactData.newListName) {
        const response = await contactService.createList({ name: contactData.newListName });
        listId = response.data.id;
        setLists(prevLists => [...prevLists, response.data]);
      }
      
      // Create the contact
      const newContact = await contactService.createContact({
        ...contactData,
        listId
      });

      // If the contact's list is currently selected, add it to the contacts array
      if (selectedList === listId) {
        setContacts(prevContacts => [...prevContacts, newContact.data]);
      }

      setSuccessMessage('Contact added successfully');
      setIsModalOpen(false);

      // Refresh contacts if we're viewing the list the contact was added to
      if (selectedList === listId) {
        const contactsResponse = await contactService.getContacts(listId);
        setContacts(contactsResponse.data);
      }
    } catch (error) {
      setError(error.message || 'Failed to save contact');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredContacts = contacts.filter(contact => {
    const fullName = `${contact.fname} ${contact.lname}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase()) || 
           contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           contact.wanumber.includes(searchTerm);
  });

  return (
    <div className="contact-lists-container">
      <h1 className="page-title">Contact Management</h1>
      
      {error && (
        <div className="error-message">
          <span>{error}</span>
          <button className="error-close-btn" onClick={() => setError('')}>×</button>
        </div>
      )}

      {successMessage && (
        <div className="success-message">
          <span>{successMessage}</span>
          <button className="success-close-btn" onClick={() => setSuccessMessage('')}>×</button>
        </div>
      )}
      
      <div className="lists-container">
        {/* Left Sidebar */}
        <div className="lists-sidebar">
          <div className="sidebar-header">
            <h2>Your Lists</h2>
          </div>
          
          {isLoading && lists.length === 0 ? (
            <div className="loading-container">
              <Loader className="loading-spinner" />
            </div>
          ) : (
            <ul className="lists-items">
              {lists.map(list => (
                <li 
                  key={list.id}
                  className={`list-item ${selectedList === list.id ? 'active' : ''}`}
                  onClick={() => setSelectedList(list.id)}
                >
                  <span>{list.name}</span>
                  {selectedList === list.id && (
                    <ChevronRight className="list-item-indicator" />
                  )}
                </li>
              ))}
            </ul>
          )}
          
          <div className="add-list-container">
            <button 
              className="add-list-btn"
              onClick={() => setShowAddListModal(true)}
            >
              <UserPlus className="add-icon" />
              Add New List
            </button>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="contacts-main">
          {isLoading && selectedList ? (
            <div className="loading-container full">
              <Loader className="loading-spinner large" />
            </div>
          ) : selectedList ? (
            <>
              <div className="contacts-header">
                <h3 className="contacts-title">
                  {lists.find(l => l.id === selectedList)?.name} Contacts
                </h3>
                
                <div className="contacts-actions">
                  <div className="search-container">
                    <div className="search-icon-wrapper">
                      <Search className="search-icon" />
                    </div>
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Search contacts..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="add-contact-btn"
                  >
                    <UserPlus className="add-icon" />
                    Add Contact
                  </button>
                </div>
              </div>

              <div className="table-container">
                {filteredContacts.length > 0 ? (
                  <table className="contacts-table">
                    <thead>
                      <tr>
                        <th className="col-name">Name</th>
                        <th className="col-whatsapp">WhatsApp</th>
                        <th className="col-email">Email</th>
                        <th className="col-actions">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredContacts.map(contact => (
                        <tr key={contact.id} className="contact-row">
                          <td className="col-name">
                            <div className="contact-name">
                              {contact.fname} {contact.lname}
                            </div>
                          </td>
                          <td className="col-whatsapp">
                            <div className="contact-whatsapp">{contact.wanumber}</div>
                          </td>
                          <td className="col-email">
                            <div className="contact-email">{contact.email}</div>
                          </td>
                          <td className="col-actions">
                            <button 
                              onClick={() => handleDelete(contact.id)}
                              className="delete-btn"
                            >
                              <Trash2 className="delete-icon" />
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="empty-contacts">
                    <div className="empty-contacts-icon">
                      <UserPlus size={48} />
                    </div>
                    <h3 className="empty-contacts-title">No contacts in this list</h3>
                    <p className="empty-contacts-message">
                      Get started by adding your first contact
                    </p>
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="btn btn-primary"
                    >
                      <UserPlus className="add-icon" />
                      Add Contact
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="no-list-selected">
              <div className="no-list-icon">
                <UserPlus size={48} />
              </div>
              <p className="no-list-title">Select a List</p>
              <p className="no-list-subtitle">Choose a contact list from the sidebar to view and manage contacts</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddListModal && (
        <AddListModal
          onClose={() => setShowAddListModal(false)}
          onAdd={handleAddList}
          isLoading={isAddingList}
        />
      )}

      <AddContactModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveContact}
        existingLists={lists}
      />
    </div>
  );
};

export default ContactLists;
