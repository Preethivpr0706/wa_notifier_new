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

-- Business details table
CREATE TABLE businesses (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  profile_image_url VARCHAR(512),
  industry ENUM('technology', 'retail', 'healthcare', 'finance', 'other') DEFAULT 'technology',
  size ENUM('small', 'medium', 'large', 'enterprise') DEFAULT 'medium',
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  website VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

alter table users add column  business_id VARCHAR(36);
INSERT INTO `whatsapp_templates`.`businesses` (`id`, `name`, `contact_phone`) VALUES (1, 'Meister Solutions', '919094995418');


alter table whatsapp_templates.campaigns add column failed_count INT NOT NULL DEFAULT 0 after delivered_count;


CREATE TABLE messages (
    id VARCHAR(255) PRIMARY KEY,
    campaign_id VARCHAR(255) NOT NULL,
    contact_id VARCHAR(255) NOT NULL,
    status ENUM('queued', 'sent', 'delivered', 'read', 'failed') DEFAULT 'queued',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
ALTER TABLE messages
ADD COLUMN error TEXT DEFAULT NULL,
ADD COLUMN whatsapp_status VARCHAR(50) DEFAULT NULL,
ADD COLUMN timestamp TIMESTAMP NULL;



CREATE TABLE message_status_history (
    id VARCHAR(50) PRIMARY KEY,
    message_id VARCHAR(200) NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



ALTER TABLE campaigns ADD COLUMN contacts JSON;
ALTER TABLE campaigns ADD COLUMN field_mappings JSON;


alter table users add column password varchar(300) default null;


--------------------------------
CREATE TABLE business_settings (
    id VARCHAR(36) PRIMARY KEY,
    business_id VARCHAR(36) NOT NULL,
    whatsapp_api_token TEXT NOT NULL,
    whatsapp_business_account_id VARCHAR(255) NOT NULL,
    whatsapp_phone_number_id VARCHAR(255) NOT NULL,
    facebook_app_id VARCHAR(255) NOT NULL,
    webhook_verify_token VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);



INSERT INTO `whatsapp_templates`.`business_settings` (`id`, `business_id`, `whatsapp_api_token`, `whatsapp_business_account_id`, `whatsapp_phone_number_id`, `facebook_app_id`, `webhook_verify_token`) VALUES ('1', '1', 'EAAHwxZB6KBfcBOzf6mb0e8S2Eum8K8QpNkNOoCRmOmWaMBznDmkgkm1p0nZCZBGve0B7gpeG7Xs9L1LAMrHKcyNdopXcQUGDnZArPGVV9dsodrFLA56WdAe6lSqmWHhLyzLIYSZCxho9OVZBY8zjbWCpPuiI3lodXxHTh8ZBpy4ZCNt3CEP5wEHSamGXmP2ZAxTQNSgZDZD', '1677607116492342', '549704921563564', '546216467891703', 'verify_token');

ALTER TABLE campaigns ADD COLUMN business_id INT NOT NULL;
ALTER TABLE messages ADD COLUMN business_id INT NOT NULL;
ALTER TABLE templates ADD COLUMN business_id INT NOT NULL;


SET SQL_SAFE_UPDATES = 0;
UPDATE `whatsapp_templates`.`campaigns` SET `business_id` = '1';
UPDATE `whatsapp_templates`.`messages` SET `business_id` = '1';
UPDATE `whatsapp_templates`.`templates` SET `business_id` = '1';

-- Add a new table for tracking URLs
CREATE TABLE tracked_urls (
    id VARCHAR(36) PRIMARY KEY,
    template_id VARCHAR(36) NOT NULL,
    original_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Add a table to track clicks per campaign
CREATE TABLE url_clicks (
    id VARCHAR(36) PRIMARY KEY,
    tracked_url_id VARCHAR(36) NOT NULL,
    campaign_id VARCHAR(36) NOT NULL,
    clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add index for better performance
CREATE INDEX idx_url_clicks ON url_clicks(tracked_url_id, campaign_id);

ALTER TABLE campaigns DROP FOREIGN KEY campaigns_ibfk_1;


INSERT INTO `whatsapp_templates`.`businesses` (`id`, `name`, `industry`, `size`, `contact_phone`) VALUES ('2', 'Meister Marketing', 'technology', 'medium', '919094995418');
INSERT INTO `whatsapp_templates`.`users` (`id`, `email`, `name`) VALUES ('2', 'harishradhakrishnan2001@gmail.com', 'Harish');
INSERT INTO `whatsapp_templates`.`business_settings` (`id`, `business_id`, `whatsapp_api_token`, `whatsapp_business_account_id`, `whatsapp_phone_number_id`, `facebook_app_id`, `webhook_verify_token`) VALUES ('2', '2', 'EAAToTF1vXmABO4DEhCC75c5rngPvZCAETSBtoZCq47tmIHloZBE9NMiqZA5xrKQzdfGP4FAjezOHikVukzP1yVUjsoHyg19v1yHItOBxlm9s4fxzX3tHeLgfLMssTYR8ynMRpf4MV31rM6ZAlVAMj8ZAxnjy3UD0oUhpcJhf9gujsDhzd4pdveUtpuYLTMDoSx138jm8g6aLvQBCclzZBqFanWIw9ZBusxl0BaVgBeq4', '748633347827575', '660116777187027', '1381314589580896', 'secret_token');
UPDATE `whatsapp_templates`.`users` SET `business_id` = '2', `password` = 'Harish6292@' WHERE (`id` = '2');


ALTER TABLE users
ADD COLUMN phone VARCHAR(20);