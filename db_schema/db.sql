create database whatsapp_templates;
use whatsapp_templates;


-- MySQL schema for WhatsApp templates system

-- Drop tables if they exist to avoid conflicts
DROP TABLE IF EXISTS template_buttons;
DROP TABLE IF EXISTS templates;
DROP TABLE IF EXISTS campaigns;
DROP TABLE IF EXISTS users;

-- Create users table
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create templates table
CREATE TABLE templates (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category ENUM('marketing', 'utility', 'authentication') NOT NULL,
  language VARCHAR(10) NOT NULL,
  header_type ENUM('text', 'image', 'video') NOT NULL,
  header_content TEXT,
  body_text TEXT NOT NULL,
  footer_text VARCHAR(255),
  status ENUM('draft', 'pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  user_id VARCHAR(36) NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create template_buttons table
CREATE TABLE template_buttons (
  id VARCHAR(36) PRIMARY KEY,
  template_id VARCHAR(36) NOT NULL,
  type ENUM('url', 'phone_number', 'quick_reply') NOT NULL,
  text VARCHAR(255) NOT NULL,
  value TEXT,
  button_order INT NOT NULL CHECK (button_order >= 0 AND button_order < 3),
  FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create campaigns table
CREATE TABLE campaigns (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  template_id VARCHAR(36) NOT NULL,
  status ENUM('draft', 'scheduled', 'sent', 'failed') NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMP NULL,
  sent_at TIMESTAMP NULL,
  recipient_count INT NOT NULL DEFAULT 0,
  delivered_count INT NOT NULL DEFAULT 0,
  read_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  user_id VARCHAR(36) NOT NULL,
  FOREIGN KEY (template_id) REFERENCES templates(id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add indexes for performance
CREATE INDEX idx_templates_user_id ON templates(user_id);
CREATE INDEX idx_templates_status ON templates(status);
CREATE INDEX idx_template_buttons_template_id ON template_buttons(template_id);
CREATE INDEX idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX idx_campaigns_template_id ON campaigns(template_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);


SET SQL_SAFE_UPDATES = 0;



INSERT INTO `whatsapp_templates`.`users` (`id`, `email`, `name`) VALUES ('1', 'preethivpr0706@gmail.com', 'Preethi');
ALTER TABLE templates ADD COLUMN variables TEXT DEFAULT NULL;

ALTER TABLE whatsapp_templates.templates
ADD COLUMN whatsapp_id VARCHAR(255),
ADD COLUMN whatsapp_status VARCHAR(50),
ADD COLUMN quality_score FLOAT,
ADD COLUMN rejection_reason TEXT;

-- Create contact_lists table
CREATE TABLE whatsapp_templates.contact_lists (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_list_name (name, user_id)
);

-- Create contacts table
CREATE TABLE whatsapp_templates.contacts (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  fname VARCHAR(100),
  lname VARCHAR(100),
  wanumber VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  list_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (list_id) REFERENCES contact_lists(id) ON DELETE CASCADE,
  UNIQUE KEY unique_contact_in_list (wanumber, list_id)
);


alter table whatsapp_templates.templates modify column header_type ENUM('text', 'image', 'video','none') NOT NULL;

ALTER TABLE whatsapp_templates.campaigns 
MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'draft';
