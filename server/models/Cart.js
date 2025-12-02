const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  platform: {
    type: String,
    required: [true, 'Please specify the platform'],
    enum: ['blinkit', 'zepto', 'swiggy', 'bigbasket'],
    lowercase: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    },
    address: {
      type: String,
      default: 'Not specified'
    },
    city: {
      type: String,
      default: 'Not specified'
    },
    pincode: {
      type: String,
      default: '000000'
    }
  },
  deliveryCharge: {
    type: Number,
    required: [true, 'Please specify delivery charge'],
    min: 0
  },
  maxMembers: {
    type: Number,
    required: [true, 'Please specify maximum members'],
    min: 2,
    max: 10,
    default: 4
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['joined', 'confirmed', 'paid', 'completed', 'cancelled'],
      default: 'joined'
    },
    splitAmount: {
      type: Number,
      default: 0
    }
  }],
  items: [{
    name: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    image: {
      type: String,
      default: ''
    },
    category: {
      type: String,
      default: ''
    }
  }],
  status: {
    type: String,
    enum: ['active', 'full', 'ordering', 'ordered', 'delivered', 'completed', 'cancelled'],
    default: 'active'
  },
  orderTime: {
    type: Date,
    default: null
  },
  deliveryTime: {
    type: Date,
    default: null
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot be more than 500 characters']
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  maxDistance: {
    type: Number,
    default: 2, // km
    min: 0.5,
    max: 5
  },
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
    }
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  chatEnabled: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Create geospatial index
cartSchema.index({ location: '2dsphere' });
cartSchema.index({ status: 1, expiresAt: 1 });
cartSchema.index({ creator: 1 });

// Calculate split amount when members change
cartSchema.methods.calculateSplitAmount = function() {
  const memberCount = this.members.length;
  if (memberCount === 0) return 0;
  
  return Math.ceil(this.deliveryCharge / memberCount);
};

// Check if cart is full
cartSchema.methods.isFull = function() {
  return this.members.length >= this.maxMembers;
};

// Add member to cart
cartSchema.methods.addMember = async function(userId) {
  if (this.isFull()) {
    throw new Error('Cart is full');
  }
  
  // Check if user is already a member
  const existingMember = this.members.find(
    member => member.user.toString() === userId.toString()
  );
  
  if (existingMember) {
    throw new Error('User is already a member of this cart');
  }
  
  this.members.push({ user: userId });
  
  // Update split amounts for all members
  const splitAmount = this.calculateSplitAmount();
  this.members.forEach(member => {
    member.splitAmount = splitAmount;
  });
  
  // Update status if cart is full
  if (this.isFull()) {
    this.status = 'full';
  }
  
  return this.save();
};

// Remove member from cart
cartSchema.methods.removeMember = async function(userId) {
  this.members = this.members.filter(
    member => member.user.toString() !== userId.toString()
  );
  
  // Update split amounts for remaining members
  if (this.members.length > 0) {
    const splitAmount = this.calculateSplitAmount();
    this.members.forEach(member => {
      member.splitAmount = splitAmount;
    });
  }
  
  // Update status
  if (this.members.length < this.maxMembers && this.status === 'full') {
    this.status = 'active';
  }
  
  return this.save();
};

// Auto-expire carts
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Cart', cartSchema);
