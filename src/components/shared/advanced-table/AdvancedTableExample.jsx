import AdvancedTable from './AdvancedTable';

const profiles = [
  {
    "lastActivity": "a few seconds ago",
    "ltv": "$365",
    "id": "1",
    "status": "regular",
    "image": "assets/Female/Cheryl-Carter.jpg",
    "icon": "message",
    "city": "San Francisco",
    "job": "Senior Financial Analyst",
    "company": "Skyble",
    "description": "Senior Financial Analyst, Skyble",
    "country": "United States",
    "gender": "Female",
    "firstname": "Cheryl",
    "lastname": "Carter",
    "name": "Cheryl Carter",
    "email": "cheryl@skyble.com",
    "phone": "2-(017)772-7449",
    "address": "396 Calypso Parkway"
  },
  {
    "lastActivity": "a minute ago",
    "ltv": "$427",
    "id": "2",
    "status": "VIP",
    "image": "assets/Female/Heather-Morales.jpg",
    "icon": "phone",
    "city": "Zelenogradsk",
    "job": "Analyst Programmer",
    "company": "Yambee",
    "description": "Analyst Programmer, Yambee",
    "country": "Russia",
    "gender": "Female",
    "firstname": "Heather",
    "lastname": "Morales",
    "name": "Heather Morales",
    "email": "hmorales1@un.org",
    "phone": "7-(897)249-9830",
    "address": "42604 Scofield Center"
  },
  {
    "lastActivity": "3 minutes ago",
    "ltv": "$538",
    "id": "3",
    "status": "VIP",
    "image": "assets/Male/Sean-Jackson.jpg",
    "icon": "phone",
    "city": "Yongqin",
    "job": "Structural Engineer",
    "company": "Linkbridge",
    "description": "Structural Engineer, Linkbridge",
    "country": "China",
    "gender": "Male",
    "firstname": "Sean",
    "lastname": "Jackson",
    "name": "Sean Jackson",
    "email": "sjackson2@youtu.be",
    "phone": "6-(527)389-6219",
    "address": "66529 Eagle Crest Junction"
  },
];

export default function AdvancedTableExample() {
  return (
    <AdvancedTable
      items={profiles}
      columns={[
        { label: 'Name', value: 'name' },
        { label: 'Email', value: 'email' },
        { label: 'Phone', value: 'phone' },
        { label: 'Ltv', value: 'ltv' }
      ]}
    />
  );
}
