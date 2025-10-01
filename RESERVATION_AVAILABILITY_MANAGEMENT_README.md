# Al Noor Palace Business Class Hotel - RESERVATION AVAILABILITY SYSTEM ANALYSIS

This document provides a comprehensive analysis of the Reservation Availability Management system with database column mapping and operational insights for room inventory control.

## **RESERVATION AVAILABILITY INTERFACE Configuration**

| Configuration Field    | Example Value                    | Database Source                              |
|------------------------|----------------------------------|----------------------------------------------|
| **Date Range**         | 23 Sep 2025 - 06 Oct 2025      | User input (date range picker)              |
| **Selected Date**      | 25-09-2025                      | User input (single date selection)          |
| **Room Type Filter**   | DELUXE                          | room_types.type_name                         |
| **Channel Type**       | Direct                          | booking_channels.channel_type                |
| **View Mode**          | Day/Week/2 Weeks/Month          | User interface preference                    |

## **ROOM AVAILABILITY CALCULATION Structure**

### Daily Occupancy Metrics (25-09-2025 DELUXE Example)
| Field Name                    | Value | Formula               | Database Table.Column                        |
|-------------------------------|-------|-----------------------|----------------------------------------------|
| **Total Number of Rooms (A)** | 22    | Static inventory      | room_types.total_rooms                       |
| **Arrival (B)**              | 7     | Daily arrivals        | COUNT(bookings.checkin_date = '2025-09-25')  |
| **Inhouse Guest (C)**         | 17    | Current occupants     | COUNT(active_stays.current_date)             |
| **Expected Checkout (D)**     | 13    | Scheduled departures  | COUNT(bookings.checkout_date = '2025-09-25') |
| **Occupancy (B+C-D) = E**     | 11    | Net room occupancy    | arrivals + inhouse - checkouts              |
| **Blocked Rooms (F)**         | 0     | Blocked inventory     | COUNT(room_blocks.block_date)                |
| **Maintenance Rooms (G)**     | 0     | Out of order rooms    | COUNT(room_maintenance.maintenance_date)     |
| **Available Rooms**           | 11    | A-(E+F+G)            | total - (occupancy + blocked + maintenance) |

## **AVAILABILITY GRID Section (Multi-Date View)**

| Column Name              | 23-Sep | 24-Sep | 25-Sep | 26-Sep | Database Table.Column                        |
|--------------------------|--------|--------|--------|--------|----------------------------------------------|
| **Date**                | Tue    | Wed    | Thu    | Fri    | availability_calendar.calendar_date          |
| **Direct Bookings**      | 8      | 10     | 15     | 16     | daily_channel_summary.direct_bookings        |
| **DELUXE Available**     | 3      | 5      | 11     | 12     | room_availability.available_rooms            |
| **DELUXE TRIPLE**        | 1      | 1      | 2      | 2      | room_availability.available_rooms            |
| **DELUXE QUADRUPLE**     | 1      | 1      | 0      | 0      | room_availability.available_rooms            |
| **KING SUITE**           | 2      | 2      | 2      | 2      | room_availability.available_rooms            |
| **PRESIDENTIAL SUITE**   | 1      | 1      | 0      | 0      | room_availability.available_rooms            |

## **DATABASE SCHEMA REQUIREMENTS**

### Core Tables Needed:

#### **1. room_availability Table (Primary)**
```sql
CREATE TABLE room_availability (
    id SERIAL PRIMARY KEY,
    room_type_id INTEGER REFERENCES room_types(id),
    availability_date DATE NOT NULL,
    total_rooms INTEGER NOT NULL,
    occupied_rooms INTEGER DEFAULT 0,
    blocked_rooms INTEGER DEFAULT 0,
    maintenance_rooms INTEGER DEFAULT 0,
    available_rooms INTEGER GENERATED ALWAYS AS (total_rooms - occupied_rooms - blocked_rooms - maintenance_rooms) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(room_type_id, availability_date)
);
```

#### **2. daily_occupancy_metrics Table**
```sql
CREATE TABLE daily_occupancy_metrics (
    id SERIAL PRIMARY KEY,
    room_type_id INTEGER REFERENCES room_types(id),
    metric_date DATE NOT NULL,
    total_inventory INTEGER NOT NULL,
    arrivals_count INTEGER DEFAULT 0,
    inhouse_count INTEGER DEFAULT 0,
    checkout_count INTEGER DEFAULT 0,
    blocked_count INTEGER DEFAULT 0,
    maintenance_count INTEGER DEFAULT 0,
    net_occupancy INTEGER GENERATED ALWAYS AS (arrivals_count + inhouse_count - checkout_count) STORED,
    available_count INTEGER GENERATED ALWAYS AS (total_inventory - arrivals_count - inhouse_count + checkout_count - blocked_count - maintenance_count) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(room_type_id, metric_date)
);
```

#### **3. room_blocks Table**
```sql
CREATE TABLE room_blocks (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES rooms(id),
    room_type_id INTEGER REFERENCES room_types(id),
    block_date_from DATE NOT NULL,
    block_date_to DATE NOT NULL,
    block_reason VARCHAR(100),
    blocked_by VARCHAR(50),
    status ENUM('Active', 'Released') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **4. room_maintenance Table**
```sql
CREATE TABLE room_maintenance (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES rooms(id),
    room_type_id INTEGER REFERENCES room_types(id),
    maintenance_date_from DATE NOT NULL,
    maintenance_date_to DATE NOT NULL,
    maintenance_type VARCHAR(50),
    description TEXT,
    assigned_staff VARCHAR(50),
    status ENUM('Scheduled', 'In Progress', 'Completed') DEFAULT 'Scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **5. active_stays Table**
```sql
CREATE TABLE active_stays (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER REFERENCES bookings(id),
    room_id INTEGER REFERENCES rooms(id),
    room_type_id INTEGER REFERENCES room_types(id),
    guest_id INTEGER REFERENCES guests(id),
    stay_date DATE NOT NULL,
    status ENUM('Checked-in', 'In-house', 'Checked-out') DEFAULT 'In-house',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(booking_id, stay_date)
);
```

#### **6. daily_channel_summary Table**
```sql
CREATE TABLE daily_channel_summary (
    id SERIAL PRIMARY KEY,
    channel_id INTEGER REFERENCES booking_channels(id),
    summary_date DATE NOT NULL,
    room_type_id INTEGER REFERENCES room_types(id),
    total_bookings INTEGER DEFAULT 0,
    direct_bookings INTEGER DEFAULT 0,
    ota_bookings INTEGER DEFAULT 0,
    corporate_bookings INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(channel_id, summary_date, room_type_id)
);
```

#### **7. availability_calendar Table**
```sql
CREATE TABLE availability_calendar (
    id SERIAL PRIMARY KEY,
    calendar_date DATE NOT NULL,
    day_of_week VARCHAR(10),
    is_weekend BOOLEAN DEFAULT FALSE,
    is_holiday BOOLEAN DEFAULT FALSE,
    season_type VARCHAR(20),
    demand_forecast DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(calendar_date)
);
```

## **OPERATIONAL INSIGHTS FROM AVAILABILITY DATA (23-09-2025 TO 06-10-2025)**

### **Room Type Performance Analysis**

#### **DELUXE Room Category (Primary Revenue Driver)**
- **Total Inventory**: 22 rooms (highest capacity)
- **Availability Range**: -2 to 18 rooms (negative indicates overbooking)
- **Peak Availability**: 02 Oct (18 rooms available)
- **Lowest Availability**: 27 Sep (-2 rooms - overbooking situation)
- **Average Availability**: 9.6 rooms/day

#### **Premium Suite Categories (Consistent Performance)**
```
Suite Availability Analysis:
├── DELUXE TRIPLE: 2 rooms (consistent availability)
├── KING SUITE: 2 rooms (100% consistent)
├── DELUXE QUADRUPLE: 0-1 rooms (weekend impact)
└── PRESIDENTIAL SUITE: 0-1 rooms (weekend impact)
```

### **Channel Performance Analysis**
| Date | Direct Bookings | Growth Pattern | Market Demand |
|------|-----------------|----------------|---------------|
| 23-Sep | 8 | Baseline | Moderate |
| 24-Sep | 10 | +25% | Increasing |
| 25-Sep | 15 | +50% | High |
| 26-Sep | 16 | Peak | Very High |
| 01-Oct | 22 | +175% | Maximum |
| 02-Oct | 24 | +200% | Peak Season |

### **Weekend vs Weekday Patterns**
```
Occupancy Patterns:
├── Weekdays (Mon-Thu): Higher availability, lower demand
├── Weekends (Fri-Sun): Lower availability, premium positioning
├── Month-end (30-Sep to 02-Oct): Peak demand period
└── Premium Suites: Weekend blackout strategy
```

## **AVAILABILITY CALCULATION WORKFLOWS**

### **Daily Metrics Computation Process**
1. **Morning Update (06:00)**: Calculate overnight stays continuation
2. **Arrival Processing**: Real-time reduction of available inventory
3. **Checkout Processing**: Real-time release of inventory
4. **Maintenance/Block Updates**: Manual inventory adjustments
5. **Evening Reconciliation (23:59)**: Final availability confirmation

### **Overbooking Management**
- **DELUXE (27-Sep)**: -2 rooms indicates strategic overbooking
- **Risk Mitigation**: Room type upgrades to premium categories
- **Revenue Optimization**: Higher ADR through controlled scarcity

### **Inventory Control Strategies**
```
Room Category Management:
├── DELUXE: Dynamic inventory (0-18 rooms range)
├── DELUXE TRIPLE: Stable availability (1-2 rooms)
├── Premium Suites: Weekend restriction strategy
└── Presidential Suite: Selective availability pattern
```

## **DATABASE TRIGGERS FOR AVAILABILITY AUTOMATION**

### **Availability Update Trigger**
```sql
CREATE OR REPLACE FUNCTION update_room_availability()
RETURNS TRIGGER AS $$
BEGIN
    -- Update availability when booking changes occur
    INSERT INTO room_availability (room_type_id, availability_date, total_rooms, occupied_rooms)
    SELECT 
        rt.id,
        generate_series(NEW.checkin_date, NEW.checkout_date - INTERVAL '1 day', INTERVAL '1 day')::date,
        rt.total_rooms,
        COALESCE(occupied_rooms, 0) + 1
    FROM room_types rt
    WHERE rt.id = NEW.room_type_id
    ON CONFLICT (room_type_id, availability_date)
    DO UPDATE SET 
        occupied_rooms = room_availability.occupied_rooms + 1,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_availability_trigger
    AFTER INSERT OR UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_room_availability();
```

### **Daily Metrics Calculation Trigger**
```sql
CREATE OR REPLACE FUNCTION calculate_daily_metrics()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO daily_occupancy_metrics (
        room_type_id, metric_date, total_inventory,
        arrivals_count, inhouse_count, checkout_count
    )
    SELECT 
        rt.id,
        NEW.availability_date,
        rt.total_rooms,
        COALESCE(arrivals.count, 0),
        COALESCE(inhouse.count, 0),
        COALESCE(checkouts.count, 0)
    FROM room_types rt
    LEFT JOIN (
        SELECT room_type_id, COUNT(*) as count
        FROM bookings 
        WHERE checkin_date = NEW.availability_date
        GROUP BY room_type_id
    ) arrivals ON rt.id = arrivals.room_type_id
    LEFT JOIN (
        SELECT room_type_id, COUNT(*) as count
        FROM active_stays 
        WHERE stay_date = NEW.availability_date
        GROUP BY room_type_id
    ) inhouse ON rt.id = inhouse.room_type_id
    LEFT JOIN (
        SELECT room_type_id, COUNT(*) as count
        FROM bookings 
        WHERE checkout_date = NEW.availability_date
        GROUP BY room_type_id
    ) checkouts ON rt.id = checkouts.room_type_id
    WHERE rt.id = NEW.room_type_id
    ON CONFLICT (room_type_id, metric_date)
    DO UPDATE SET
        arrivals_count = EXCLUDED.arrivals_count,
        inhouse_count = EXCLUDED.inhouse_count,
        checkout_count = EXCLUDED.checkout_count,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## **QUERY EXAMPLES FOR AVAILABILITY REPORTING**

### **Generate Availability Grid Report**
```sql
SELECT 
    ac.calendar_date,
    EXTRACT(DOW FROM ac.calendar_date) as day_of_week,
    rt.type_name as room_type,
    ra.total_rooms,
    ra.occupied_rooms,
    ra.blocked_rooms,
    ra.maintenance_rooms,
    ra.available_rooms,
    dcs.direct_bookings,
    ROUND((ra.occupied_rooms::DECIMAL / ra.total_rooms) * 100, 2) as occupancy_percentage
FROM availability_calendar ac
CROSS JOIN room_types rt
LEFT JOIN room_availability ra ON (ac.calendar_date = ra.availability_date AND rt.id = ra.room_type_id)
LEFT JOIN daily_channel_summary dcs ON (ac.calendar_date = dcs.summary_date AND rt.id = dcs.room_type_id)
WHERE ac.calendar_date BETWEEN '2025-09-23' AND '2025-10-06'
AND rt.type_name IN ('DELUXE', 'DELUXE TRIPLE', 'DELUXE QUADRUPLE', 'KING SUITE', 'PRESIDENTIAL SUITE')
ORDER BY ac.calendar_date, rt.type_name;
```

### **Generate Daily Occupancy Metrics**
```sql
SELECT 
    dom.metric_date,
    rt.type_name as room_type,
    dom.total_inventory as "Total Rooms (A)",
    dom.arrivals_count as "Arrivals (B)",
    dom.inhouse_count as "Inhouse (C)",
    dom.checkout_count as "Checkouts (D)",
    dom.net_occupancy as "Occupancy (B+C-D)",
    dom.blocked_count as "Blocked (F)",
    dom.maintenance_count as "Maintenance (G)",
    dom.available_count as "Available A-(E+F+G)"
FROM daily_occupancy_metrics dom
JOIN room_types rt ON dom.room_type_id = rt.id
WHERE dom.metric_date = '2025-09-25'
AND rt.type_name = 'DELUXE'
ORDER BY dom.metric_date;
```

### **Generate Overbooking Analysis Report**
```sql
SELECT 
    ra.availability_date,
    rt.type_name,
    ra.total_rooms,
    ra.occupied_rooms,
    ra.available_rooms,
    CASE 
        WHEN ra.available_rooms < 0 THEN ABS(ra.available_rooms)
        ELSE 0
    END as overbooking_count,
    CASE 
        WHEN ra.available_rooms < 0 THEN 'OVERBOOKED'
        WHEN ra.available_rooms = 0 THEN 'SOLD OUT'
        ELSE 'AVAILABLE'
    END as status
FROM room_availability ra
JOIN room_types rt ON ra.room_type_id = rt.id
WHERE ra.availability_date BETWEEN '2025-09-23' AND '2025-10-06'
AND ra.available_rooms <= 0
ORDER BY ra.availability_date, rt.type_name;
```

## **BUSINESS INTELLIGENCE INSIGHTS - AVAILABILITY ANALYSIS**

### **Revenue Optimization Opportunities**
- **Peak Demand Windows**: 01-02 Oct (24+ direct bookings)
- **Upselling Potential**: DELUXE overbooking → Premium suite upgrades
- **Pricing Strategy**: Weekend premium positioning for suites

### **Operational Efficiency Metrics**
| Room Type | Utilization Rate | Availability Variance | Revenue Impact |
|-----------|------------------|---------------------|-----------------|
| **DELUXE** | 85-105% | High (±10 rooms) | Primary driver |
| **DELUXE TRIPLE** | 50-100% | Low (±1 room) | Stable contributor |
| **KING SUITE** | 0-50% | None | Premium positioning |
| **PRESIDENTIAL** | 0-100% | Medium | Luxury segment |

### **Demand Forecasting Insights**
```
Market Demand Trends:
├── 23-25 Sep: Gradual increase (8→15 bookings)
├── 26-30 Sep: Sustained high demand (14-16 bookings)
├── 01-02 Oct: Peak season (22-24 bookings)
└── 03-06 Oct: Stabilization (13-23 bookings)
```

### **Channel Performance Analysis**
- **Direct Channel Growth**: 200% increase from baseline to peak
- **Market Penetration**: Strong direct booking performance
- **Revenue Potential**: High-value customer acquisition through direct channel

### **Occupancy Pattern Intelligence**
```
Weekly Pattern Analysis:
├── Monday-Tuesday: Low demand, high availability
├── Wednesday-Thursday: Moderate demand, building occupancy  
├── Friday-Saturday: Peak demand, premium pricing opportunity
└── Sunday: Transition day, checkout heavy
```

## **SYSTEM RECOMMENDATIONS - AVAILABILITY MANAGEMENT**

### **Inventory Optimization**
1. **Dynamic Overbooking**: Implement automated overbooking algorithms based on historical no-show rates
2. **Real-time Updates**: Live availability sync across all booking channels and PMS
3. **Predictive Analytics**: Machine learning models for 30-day demand forecasting

### **Revenue Management Enhancement**
1. **Yield Optimization**: Dynamic pricing based on availability and demand patterns
2. **Channel Management**: Optimize inventory allocation per channel based on ADR performance
3. **Upgrade Automation**: Systematic room category upgrades for overbooking situations

### **Operational Improvements**
1. **Maintenance Scheduling**: Coordinate room maintenance with low-demand periods
2. **Block Management**: Strategic inventory holds for corporate clients and group bookings
3. **Availability Alerts**: Real-time notifications for critical availability thresholds

### **Technology Integration**
1. **API Integration**: Seamless connectivity with OTA channels and booking engines
2. **Mobile Dashboard**: Real-time availability monitoring for management
3. **Automated Reporting**: Daily availability and occupancy reports

### **Performance Monitoring**
1. **KPI Dashboards**: Track availability, occupancy, and revenue metrics
2. **Forecasting Accuracy**: Monitor prediction vs actual performance
3. **Channel Performance**: Analyze booking source efficiency and profitability

## **RISK MANAGEMENT STRATEGIES**

### **Overbooking Risk Mitigation**
- **Walk Policy**: Established procedures for guest relocation
- **Upgrade Matrix**: Systematic approach to room category upgrades  
- **Compensation Guidelines**: Guest service recovery protocols
- **Partner Hotels**: Network for emergency accommodation

### **Maintenance Impact Management**
- **Preventive Scheduling**: Plan maintenance during low-occupancy periods
- **Emergency Protocols**: Rapid room reassignment procedures
- **Guest Communication**: Proactive notification for room changes

### **System Reliability**
- **Data Backup**: Regular availability data backups
- **Failover Systems**: Backup availability calculation systems
- **Manual Override**: Emergency manual availability management

---

*This document serves as a technical reference for implementing and understanding the Reservation Availability Management system with complete database schema, operational workflows, and revenue optimization strategies.*

## **SYSTEM CAPABILITIES SUMMARY**

✅ **Real-time Availability Tracking** - Live inventory management across all room categories  
✅ **Multi-Channel Integration** - Unified availability distribution across booking sources  
✅ **Overbooking Management** - Strategic revenue optimization with risk controls  
✅ **Maintenance Coordination** - Operational efficiency with minimal revenue impact  
✅ **Demand Forecasting** - Predictive availability planning for revenue maximization  
✅ **Revenue Optimization** - Dynamic pricing and systematic upselling opportunities  
✅ **Performance Analytics** - Comprehensive reporting for strategic decision making  
✅ **Risk Management** - Comprehensive protocols for operational continuity
