const { ApolloServer, gql } = require('apollo-server');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

mongoose.connect('mongodb://localhost:27017/comp3133_assigment1', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);

const employeeSchema = new mongoose.Schema({
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  gender: String,
  salary: { type: Number, required: true }
});

const Employee = mongoose.model('Employee', employeeSchema);

const typeDefs = gql`
type Query {
  login(username: String!, password: String!): AuthPayload
  getAllEmployees: [Employee]
  searchEmployeeByEid(eid: ID!): Employee
}

type Mutation {
  signup(username: String!, email: String!, password: String!): AuthPayload
  addNewEmployee(first_name: String!, last_name: String!, email: String!, gender: Gender, salary: Float!): Employee
  updateEmployeeByEid(eid: ID!, first_name: String, last_name: String, email: String, gender: Gender, salary: Float): Employee
  deleteEmployeeByEid(eid: ID!): DeletePayload
}

enum Gender {
  Male
  Female
  Other
}

type User {
  _id: ID!
  username: String!
  email: String!
  password: String!
}

type Employee {
  _id: ID!
  first_name: String!
  last_name: String!
  email: String!
  gender: Gender
  salary: Float!
}

type AuthPayload {
  token: String
  user: User
}

type DeletePayload {
  success: Boolean
  message: String
}
`;

const resolvers = {
  Query: {
    async login(_, { username, password }) {
      const user = await User.findOne({ $or: [{ username }, { email: username }] });
      if (!user || !(await bcrypt.compare(password, user.password))) {
        throw new Error('Invalid credentials');
      }
      const token = jwt.sign({ userId: user.id }, 'YOUR_SECRET_KEY', { expiresIn: '1d' });
      return { token, user };
    },
    async getAllEmployees() {
      return await Employee.find({});
    },
    async searchEmployeeByEid(_, { eid }) {
      return await Employee.findById(eid);
    }
  },
  Mutation: {
    async signup(_, { username, email, password }) {
      const existingUser = await User.findOne({ $or: [{ email }, { username }] });
      if (existingUser) {
        throw new Error('User already exists');
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({ username, email, password: hashedPassword });
      await user.save();

      const token = jwt.sign({ userId: user.id }, 'YOUR_SECRET_KEY', { expiresIn: '1d' });
      return { token, user };
    },
    async addNewEmployee(_, { first_name, last_name, email, gender, salary }) {
      const newEmployee = new Employee({ first_name, last_name, email, gender, salary });
      await newEmployee.save();
      return newEmployee;
    },
    async updateEmployeeByEid(_, { eid, first_name, last_name, email, gender, salary }) {
      const updatedEmployee = await Employee.findByIdAndUpdate(eid, { first_name, last_name, email, gender, salary }, { new: true });
      return updatedEmployee;
    },
    async deleteEmployeeByEid(_, { eid }) {
      await Employee.findByIdAndDelete(eid);
      return { success: true, message: 'Employee deleted successfully' };
    }
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    
  }
});

server.listen().then(({ url }) => {
  console.log(`Server ready at ${url}`);
});
