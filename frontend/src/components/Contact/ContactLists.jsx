import { useState, useEffect } from 'react';
import { getLists, getContacts, deleteContact } from '../../api/contactService';
import { Trash2, Loader, ChevronRight, UserPlus, Search } from 'lucide-react';
import './ContactLists.css'; // Import the separate CSS file

const ContactLists = () => {
  const [lists, setLists] = useState([]);
  const [selectedList, setSelectedList] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const listsResponse = await getLists();
        setLists(listsResponse.data);
      } catch (err) {
        setError(err.message || 'Failed to load contact lists');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedList) {
      const fetchContacts = async () => {
        try {
          setIsLoading(true);
          const contactsResponse = await getContacts(selectedList);
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
      await deleteContact(contactId);
      setContacts(contacts.filter(c => c.id !== contactId));
    } catch (err) {
      setError(err.message || 'Failed to delete contact');
    }
  };

  const filteredContacts = contacts.filter(contact => {
    const fullName = `${contact.fname} ${contact.lname}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase()) || 
           contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
           contact.wanumber.includes(searchTerm);
  });

  return (
    <div className="contact-lists-container">
      <h1 className="page-title">Contact Management</h1>
      
      {error && (
        <div className="error-message">
          <span>{error}</span>
          <button 
            className="error-close-btn"
            onClick={() => setError('')}
          >
            ×
          </button>
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
            <button className="add-list-btn">
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
                  <button className="add-contact-btn">
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
                    <div className="empty-contacts-message">No contacts found</div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="no-list-selected">
              <div className="no-list-icon">
                <svg className="contact-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <p className="no-list-title">No list selected</p>
              <p className="no-list-subtitle">Select a contact list from the sidebar to view its contacts</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactLists;