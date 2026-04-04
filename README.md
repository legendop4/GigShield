# GigShield AI

### AI Powered Parametric Insurance for Gig Economy Workers

GigShield AI is a platform that helps delivery workers. It protects them from losing income in situations like bad weather, pollution and city rules.

GigShield AI is different from existing insurance systems. It uses a model where payments are made automatically by constantly monitoring the environment. This means that workers do not have to make a claim and wait for someone to decide if they should get paid.

The system uses AI to figure out the amount of risk that exists and to keep an eye on people trying to cheat the system. It takes all the necessary steps to make sure that workers get a safe insurance experience that fits with their weekly pay cycle.

## About the Project

GigShield AI is a data-driven parametric insurance platform designed to protect gig delivery workers from income loss caused by disruptions such as extreme weather, pollution and urban restrictions.

Unlike insurance systems that rely on manual claims and subjective verification GigShield operates on a parametric model, where payouts are triggered automatically based on objective environmental data signals.

This system integrates AI-based risk assessment, real-time trigger monitoring and adversarial fraud detection technique to deliver a secure and zero-touch insurance experience that aligns with the weekly earning cycle of gig workers.

## Inspiration

The idea for GigShield AI comes from observing the tough living conditions of gig workers in India. They often have to deal with situations that are not in their control like bad weather or city rules which makes it hard for them to earn money.

We discovered a problem: traditional insurance products are not designed for gig workers who have to deal with lots of ups and downs in their income. So we decided to look into parametric insurance systems, where payments are made based on situations rather than manual claims. This makes the system automatic, fair and able to handle lots of users.

## What it does

GigShield AI provides an automated insurance lifecycle. This means that workers do not have to do anything or initiate to get insurance or make a claim. Everything is taken care of by the system instead.

### AI-Based Risk Assessment

The system uses intelligence to figure out how much risk there is in a particular area. It monitors situations such as the weather, traffic, pollution and past mishaps. This helps to determine how much the worker should pay for insurance and if they are eligible for coverage.

The system uses a formula to calculate the risk:

$$
Risk = 0.4 \cdot Weather + 0.3 \cdot Traffic + 0.2 \cdot Pollution + 0.1 \cdot HistoricalDisruption
$$

This score is used to decide how much the worker should pay for insurance. If they are eligible for coverage.

### Dynamic Weekly Premium Model

The system also uses a formula to decide how much premium should the worker pay for insurance weekly. This is based on the amount of risk and coverage pay out the system will have to give.

Premium = Expected Loss + Margin

Where:

Expected Loss = P(Disruption) * Average Payout

This helps to make sure that the system is fair and that workers are not paying more for insurance.

### Parametric Trigger Engine

The system uses an engine to trigger payments under certain situations, like bad weather or pollution. This is based on data from trusted sources.This ensures quick, fair and automatic payments.

| Event        | Trigger Condition |
|--------------|------------------|
| Rainfall     | > 50 mm          |
| Temperature  | > 45°C           |
| AQI          | > 400            |
| Curfew       | Government signal|

### Zero-Touch Claim Automation

When the system detects that a payment should be made it takes care of everything automatically. This includes checking the worker's eligibility and looking for signs of cheating while making the payment.

## Adversarial Defense & Anti-Spoofing Strategy

GigShield AI is designed with a **zero-trust, multi-signal verification architecture** to defend against GPS spoofing and coordinated fraud attacks while ensuring fairness for genuine workers.

---

### 1. Differentiation: Genuine Worker vs Bad Actor

Our system does not rely on GPS alone. Instead, it differentiates users based on **behavioral consistency and contextual validation**.

#### Key Logic:

- A **genuine worker** shows:
  - consistent delivery activity over time  
  - realistic movement patterns  
  - gradual location changes  
  - regular working hours  

- A **fraudulent user** often shows:
  - sudden activity only during disruption events  
  - static or unrealistic location jumps  
  - no historical delivery behavior  
  - multiple claims in short time  

#### Decision Mechanism:

Each claim is assigned a **Fraud Risk Score (0–1)**:

| Score Range | Action            |
|-------------|-------------------|
| 0 – 0.3     | Auto-approved     |
| 0.3 – 0.7   | Soft verification |
| 0.7 – 1.0   | Flagged / blocked |

---

### 2. Data: Multi-Signal Fraud Detection

To detect spoofing and fraud rings, GigShield analyzes multiple data points beyond GPS:

#### Location Intelligence
- GPS coordinates  
- IP address geolocation  
- network region / ISP patterns  

#### Behavioral Data
- delivery frequency  
- active working hours  
- session duration  
- historical consistency  

#### Activity Verification
- recent deliveries (last 24–48 hrs)  
- app usage patterns  
- login timestamps  

#### Device Fingerprinting
- device ID  
- browser fingerprint  
- OS / device metadata  

#### Network-Level Signals (Fraud Ring Detection)
- shared IP clusters  
- simultaneous claims  
- identical device patterns  
- synchronized activity timing  

#### Detection Insight:

Fraud rings are identified using **clustering and graph-based analysis**, where multiple suspicious users form a connected pattern.

---

### 3. UX Balance: Fairness for Honest Workers

GigShield ensures that fraud detection does not negatively impact genuine users.

#### Soft Verification Workflow

Instead of immediate rejection:

- claims are marked as **“Under Review”**  
- additional validation checks are applied  
- payout may be delayed but not denied  

---

#### Trust Score System

Each user is assigned a **Trust Score** based on:

- historical activity  
- consistency  
- past claim behavior  

High-trust users receive:

- faster approvals  
- minimal friction  

---

#### Network Failure Handling

In case of genuine issues (e.g., poor connectivity during bad weather):

- temporary data gaps are tolerated  
- historical behavior is prioritized  
- fallback validation methods are used  

---

### Outcome

This architecture ensures:

- accurate detection of GPS spoofing  
- identification of coordinated fraud rings  
- minimal false positives  
- fair treatment of genuine workers  
- long-term system sustainability  

---

> “We don’t just verify claims — we verify reality using multiple independent signals.”

The system has a layer to detect and prevent cheating. This includes checking the workers location looking at their behavior over time and making sure that they are not exploting the system.

Each claim is given a score based on how it is to be fake. If the score is high the claim is flagged for further review.

## How we built it

The tools and technologies that are going to be used to build GigShield AI include React, Tailwind CSS, Node.js, Express.js, MongoDB, Python Scikit-learn and OpenWeatherMap API.

### System Architecture  
---

### AI/ML Components  

- Risk Prediction Model → Logistic Regression / Random Forest  
- Fraud Detection Model → Isolation Forest  
- Cluster Detection → K-Means / DBSCAN  

---

###  External Data Sources  

- Weather API (OpenWeatherMap)  
- AQI API  
- Mock Traffic APIs  

---

### Tech Stack  

**Frontend:** React.js, Tailwind CSS  
**Backend:** Node.js, Express.js  
**Database:** MongoDB  
**AI/ML:** Python, Scikit-learn, Pandas  
**Payments:** Razorpay Sandbox  
**Deployment:** Vercel / Render  


## Challenges we ran into

We had to overcome many challenges while building GigShield AI. These included detecting cheating at scale designing, parametric triggers dealing with limited data and making sure that the system could process payments in real-time.

## Accomplishments that we're proud of

We are proud of what we have achieved with GigShield AI. This includes designing a production-grade parametric insurance architecture building a 5-layer fraud detection system implementing AI-based dynamic pricing and developing a predictive risk intelligence engine.

## What we learned

We learned a lot while building GigShield AI. This includes the importance of using insurance models in the real world the need for multi-signal verification in adversarial systems and the challenge of balancing user experience with system security.

## What's next for GigShield

We have plans for GigShield AI. These include integrating with gig platforms using telecom-level location verification creating a blockchain-based claim audit trail and expanding to other gig sectors.

## Built With

GigShield AI was built using a variety of tools and technologies. These include React, Tailwind CSS, Node.js, Express.js, MongoDB, Python, Scikit-learn, OpenWeatherMap API and Razorpay Sandbox.


## GitHub Repository
You can find the GitHub repository, for GigShield AI at https://github.com/anikita15/GigShield.git.

## Demo Video

You can watch a demo video of GigShield AI at https://youtu.be/Yz8TQJRpDBg.
