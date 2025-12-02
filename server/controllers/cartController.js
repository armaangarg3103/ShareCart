const Cart = require('../models/Cart');
const User = require('../models/User');
const axios = require('axios');

// Helper function to calculate distance between two points
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return distance;
};

// @desc    Get all active carts near user
// @route   GET /api/carts
// @access  Private
exports.getCarts = async (req, res, next) => {
  try {
    const { 
      platform, 
      maxDistance, 
      city, 
      status,
      sortBy = 'distance',
      page = 1, 
      limit = 10,
      minItems,
      maxItems
    } = req.query;
    
    const userLocation = req.user.location.coordinates;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    let query = {
      status: status ? status : { $in: ['active', 'full'] },
      isPublic: true,
      expiresAt: { $gt: new Date() },
      creator: { $ne: req.user.id }
    };

    // Filter by platform
    if (platform && platform !== 'all') {
      query.platform = platform.toLowerCase();
    }

    // Filter by city
    if (city && city !== 'all') {
      query['location.city'] = city;
    }

    // Filter by item count
    if (minItems) {
      query['items'] = { $exists: true };
    }

    // Get total count for pagination
    const totalCarts = await Cart.countDocuments(query);

    // Get carts with pagination
    let carts = await Cart.find(query)
      .populate('creator', 'name avatar rating phone')
      .populate('members.user', 'name avatar rating')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit) * 3) // Get more to filter by distance
      .lean();

    // Calculate distance and add to each cart
    carts = carts.map(cart => {
      const distance = calculateDistance(
        userLocation[1], userLocation[0],
        cart.location.coordinates[1], cart.location.coordinates[0]
      );
      return {
        ...cart,
        distance: Math.round(distance * 10) / 10
      };
    });

    // Filter by maxDistance
    if (maxDistance) {
      carts = carts.filter(cart => cart.distance <= parseFloat(maxDistance));
    } else {
      carts = carts.filter(cart => cart.distance <= cart.maxDistance);
    }

    // Filter by item count range
    if (minItems || maxItems) {
      carts = carts.filter(cart => {
        const itemCount = (cart.items || []).length;
        if (minItems && itemCount < parseInt(minItems)) return false;
        if (maxItems && itemCount > parseInt(maxItems)) return false;
        return true;
      });
    }

    // Sort carts
    switch(sortBy) {
      case 'distance':
        carts.sort((a, b) => a.distance - b.distance);
        break;
      case 'newest':
        carts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'members':
        carts.sort((a, b) => (b.members?.length || 0) - (a.members?.length || 0));
        break;
      case 'items':
        carts.sort((a, b) => (b.items?.length || 0) - (a.items?.length || 0));
        break;
      default:
        carts.sort((a, b) => a.distance - b.distance);
    }

    // Apply pagination after filtering
    const totalFilteredCarts = carts.length;
    const paginatedCarts = carts.slice(skip, skip + parseInt(limit));

    res.status(200).json({
      success: true,
      count: paginatedCarts.length,
      total: totalFilteredCarts,
      totalPages: Math.ceil(totalFilteredCarts / parseInt(limit)),
      currentPage: parseInt(page),
      data: paginatedCarts
    });
  } catch (error) {
    console.error('Get carts error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single cart
// @route   GET /api/carts/:id
// @access  Private
exports.getCart = async (req, res, next) => {
  try {
    const cart = await Cart.findById(req.params.id)
      .populate('creator', 'name avatar rating phone email')
      .populate('members.user', 'name avatar rating phone email');

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    // Calculate distance from user
    const userLocation = req.user.location.coordinates;
    const distance = calculateDistance(
      userLocation[1], userLocation[0],
      cart.location.coordinates[1], cart.location.coordinates[0]
    );

    res.status(200).json({
      success: true,
      data: {
        ...cart.toObject(),
        distance: Math.round(distance * 10) / 10
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create new cart
// @route   POST /api/carts
// @access  Private
exports.createCart = async (req, res, next) => {
  try {
    // Add user as creator
    req.body.creator = req.user.id;
    
    // Ensure all required fields have defaults
    const cartData = {
      ...req.body,
      creator: req.user.id,
      items: req.body.items || [],
      platform: req.body.platform || 'blinkit',
      deliveryCharge: req.body.deliveryCharge || 50,
      maxMembers: req.body.maxMembers || 4,
      status: 'active',
      isPublic: req.body.isPublic !== undefined ? req.body.isPublic : true,
      maxDistance: req.body.maxDistance || 2,
      chatEnabled: req.body.chatEnabled !== undefined ? req.body.chatEnabled : true,
      totalOrders: 0,
      expiresAt: req.body.expiresAt || new Date(Date.now() + 2 * 60 * 60 * 1000)
    };

    // Ensure location has all required fields
    if (cartData.location) {
      cartData.location = {
        type: 'Point',
        coordinates: cartData.location.coordinates || req.user.location.coordinates,
        address: cartData.location.address || req.user.location.address || 'Not specified',
        city: cartData.location.city || req.user.location.city || 'Not specified',
        pincode: cartData.location.pincode || req.user.location.pincode || '000000'
      };
    } else if (req.user.location) {
      cartData.location = {
        type: 'Point',
        coordinates: req.user.location.coordinates,
        address: req.user.location.address || 'Not specified',
        city: req.user.location.city || 'Not specified',
        pincode: req.user.location.pincode || '000000'
      };
    }
    
    // Add creator as first member
    cartData.members = [{
      user: req.user.id,
      joinedAt: new Date(),
      status: 'joined',
      splitAmount: cartData.deliveryCharge
    }];

    const cart = await Cart.create(cartData);

    const populatedCart = await Cart.findById(cart._id)
      .populate('creator', 'name avatar rating phone')
      .populate('members.user', 'name avatar rating');

    // Emit socket event (will be handled by socket.io)
    if (global.io) {
      global.io.emit('cart:created', populatedCart);
    }

    res.status(201).json({
      success: true,
      data: populatedCart
    });
  } catch (error) {
    console.error('Create cart error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Join a cart
// @route   POST /api/carts/:id/join
// @access  Private
exports.joinCart = async (req, res, next) => {
  try {
    const cart = await Cart.findById(req.params.id);

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    // Check if cart is expired
    if (cart.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'This cart has expired'
      });
    }

    // Check if cart is active
    if (!['active', 'full'].includes(cart.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot join this cart'
      });
    }

    // Check distance
    const userLocation = req.user.location.coordinates;
    const distance = calculateDistance(
      userLocation[1], userLocation[0],
      cart.location.coordinates[1], cart.location.coordinates[0]
    );

    if (distance > cart.maxDistance) {
      return res.status(400).json({
        success: false,
        message: `You are ${distance.toFixed(1)}km away. Maximum allowed distance is ${cart.maxDistance}km`
      });
    }

    // Add member
    await cart.addMember(req.user.id);

    const updatedCart = await Cart.findById(cart._id)
      .populate('creator', 'name avatar rating phone')
      .populate('members.user', 'name avatar rating');

    // Emit socket event
    if (global.io) {
      global.io.to(`cart_${cart._id}`).emit('cart:member_joined', {
        cart: updatedCart,
        user: req.user
      });
    }

    res.status(200).json({
      success: true,
      data: updatedCart
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Leave a cart
// @route   POST /api/carts/:id/leave
// @access  Private
exports.leaveCart = async (req, res, next) => {
  try {
    const cart = await Cart.findById(req.params.id);

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    // Check if user is creator
    if (cart.creator.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Creator cannot leave the cart. Please delete the cart instead.'
      });
    }

    // Check if order is already placed
    if (['ordering', 'ordered', 'delivered'].includes(cart.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot leave cart after order is placed'
      });
    }

    // Remove member
    await cart.removeMember(req.user.id);

    const updatedCart = await Cart.findById(cart._id)
      .populate('creator', 'name avatar rating phone')
      .populate('members.user', 'name avatar rating');

    // Emit socket event
    if (global.io) {
      global.io.to(`cart_${cart._id}`).emit('cart:member_left', {
        cart: updatedCart,
        userId: req.user.id
      });
    }

    res.status(200).json({
      success: true,
      data: updatedCart
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update cart
// @route   PUT /api/carts/:id
// @access  Private
exports.updateCart = async (req, res, next) => {
  try {
    let cart = await Cart.findById(req.params.id);

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    // Check if user is creator
    if (cart.creator.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this cart'
      });
    }

    // Don't allow updates after ordering
    if (['ordering', 'ordered', 'delivered'].includes(cart.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update cart after order is placed'
      });
    }

    // Prepare update data with defaults
    const updateData = { ...req.body };

    // Ensure location has all required fields if being updated
    if (updateData.location && updateData.location.coordinates) {
      updateData.location = {
        type: 'Point',
        coordinates: updateData.location.coordinates,
        address: updateData.location.address || cart.location.address || 'Not specified',
        city: updateData.location.city || cart.location.city || 'Not specified',
        pincode: updateData.location.pincode || cart.location.pincode || '000000'
      };
    }

    // If items are being updated, ensure they have proper structure
    if (updateData.items && Array.isArray(updateData.items)) {
      updateData.items = updateData.items.map(item => ({
        name: item.name || 'Unknown Item',
        quantity: item.quantity || 1,
        price: item.price || 0,
        image: item.image || '',
        category: item.category || ''
      }));
    }

    // If members are being updated, ensure proper structure
    if (updateData.members && Array.isArray(updateData.members)) {
      const memberCount = updateData.members.length;
      const splitAmount = Math.ceil((updateData.deliveryCharge || cart.deliveryCharge) / memberCount);
      updateData.members = updateData.members.map(member => ({
        user: member.user,
        joinedAt: member.joinedAt || new Date(),
        status: member.status || 'joined',
        splitAmount: splitAmount
      }));
    }

    cart = await Cart.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    }).populate('creator', 'name avatar rating phone')
      .populate('members.user', 'name avatar rating');

    // Emit socket event
    if (global.io) {
      global.io.to(`cart_${cart._id}`).emit('cart:updated', cart);
    }

    res.status(200).json({
      success: true,
      data: cart
    });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete cart
// @route   DELETE /api/carts/:id
// @access  Private
exports.deleteCart = async (req, res, next) => {
  try {
    const cart = await Cart.findById(req.params.id);

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    // Check if user is creator
    if (cart.creator.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this cart'
      });
    }

    // Don't allow deletion after ordering
    if (['ordering', 'ordered', 'delivered'].includes(cart.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete cart after order is placed'
      });
    }

    await cart.deleteOne();

    // Emit socket event
    if (global.io) {
      global.io.to(`cart_${cart._id}`).emit('cart:deleted', { cartId: cart._id });
    }

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get user's carts (created or joined)
// @route   GET /api/carts/my/all
// @access  Private
exports.getMyCarts = async (req, res, next) => {
  try {
    const carts = await Cart.find({
      $or: [
        { creator: req.user.id },
        { 'members.user': req.user.id }
      ]
    })
      .populate('creator', 'name avatar rating phone')
      .populate('members.user', 'name avatar rating')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: carts.length,
      data: carts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
